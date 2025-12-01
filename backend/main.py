import torch
from torchvision import models, transforms
from PIL import Image
import io
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import base64

# ----------------- Class names (Gardiner Codes) -----------------
class_names = [
    'Aa13', 'Aa15', 'E9', 'F18', 'G35', 'G39', 'G7', 'N30', 'O28', 'P8',
    'a1', 'a19', 'a2', 'a24', 'a30', 'a40', 'a42', 'a50', 'b1', 'd1', 'd2', 'd21',
    'd28', 'd35', 'd36', 'd37', 'd39', 'd4', 'd40', 'd45', 'd46', 'd52', 'd54', 'd55',
    'd58', 'd60', 'e1', 'e23', 'e34', 'f1', 'f12', 'f13', 'f21', 'f26', 'f31', 'f32',
    'f34', 'f35', 'f39', 'f4', 'g1', 'g14', 'g17', 'g25', 'g36', 'g37', 'g38', 'g40',
    'g43', 'g5', 'h1', 'h6', 'i1', 'i10', 'i9', 'l1', 'l2', 'm12', 'm16', 'm17', 'm18',
    'm2', 'm20', 'm23', 'm3', 'm42', 'n1', 'n14', 'n18', 'n25', 'n26', 'n29', 'n31',
    'n33', 'n35', 'n36', 'n37', 'n42', 'n5', 'n8', 'o1', 'o29', 'o3', 'o34', 'o4',
    'o49', 'o50', 'o6', 'q1', 'q2', 'q3', 'r11', 'r14', 'r4', 'r7', 'r8', 's19',
    's21', 's24', 's27', 's28', 's29', 's3', 's34', 's38', 's40', 't21', 't22', 't28',
    'u1', 'u15', 'u23', 'u33', 'u6', 'u7', 'v1', 'v10', 'v13', 'v20', 'v28', 'v29',
    'v30', 'v31', 'v4', 'v6', 'v7', 'w11', 'w14', 'w15', 'w17', 'w18', 'w19', 'w22',
    'w23', 'w24', 'w25', 'x1', 'x7', 'x8', 'y1', 'y2', 'y3', 'y4', 'y5', 'z1', 'z11',
    'z2', 'z3', 'z4'
]

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Device -----------------
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# ----------------- Load Model at Startup -----------------
model = None

@app.on_event("startup")
async def load_model():
    global model
    print("Loading EfficientNetV2-S model...")
    
    # Initialize model architecture
    model = models.efficientnet_v2_s(weights=None)
    num_classes = len(class_names)
    model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, num_classes)
    
    # Load trained weights - UPDATE THIS PATH to your model location
    model_path = "model/EfficientNetV2-S_best_model2.pth"  # Adjust path as needed
    model.load_state_dict(torch.load(model_path, map_location=DEVICE))
    model.to(DEVICE)
    model.eval()
    
    print(f"Model loaded successfully on {DEVICE}")

# ----------------- Transform -----------------
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# ----------------- Prediction Function -----------------
def predict_hieroglyph(image_bytes):
    """
    Predicts hieroglyph from image bytes
    Returns: dict with gardiner_code, confidence, and top_5 predictions
    """
    try:
        # Load image from bytes
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Transform image
        img_tensor = transform(img).unsqueeze(0).to(DEVICE)
        
        # Inference
        with torch.no_grad():
            outputs = model(img_tensor)
            probs = torch.nn.functional.softmax(outputs, dim=1)
            
            # Get top prediction
            conf, pred_idx = torch.max(probs, 1)
            predicted_class = class_names[pred_idx.item()]
            confidence = float(conf.item())
            
            # Get top 5 predictions
            top5_probs, top5_indices = torch.topk(probs[0], k=5)
            top5_predictions = [
                {
                    "gardiner_code": class_names[idx.item()],
                    "confidence": float(top5_probs[i].item())
                }
                for i, idx in enumerate(top5_indices)
            ]
        
        return {
            "gardiner_code": predicted_class,
            "confidence": confidence,
            "top_5": top5_predictions
        }
    
    except Exception as e:
        print(f"Error in prediction: {str(e)}")
        raise e

# ----------------- API Endpoints -----------------

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Endpoint to receive cropped image and return prediction
    """
    try:
        # Read image bytes
        image_bytes = await file.read()
        
        # Get prediction
        result = predict_hieroglyph(image_bytes)
        
        return {
            "success": True,
            "prediction": result
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.post("/predict-base64")
async def predict_base64(data: dict):
    """
    Alternative endpoint for base64 encoded images
    """
    try:
        # Decode base64 image
        image_data = data.get("image")
        if image_data.startswith("data:image"):
            image_data = image_data.split(",")[1]
        
        image_bytes = base64.b64decode(image_data)
        
        # Get prediction
        result = predict_hieroglyph(image_bytes)
        
        return {
            "success": True,
            "prediction": result
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/")
async def root():
    return {"message": "Ancient Decoder Backend - PyTorch Model", "status": "running"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "device": str(DEVICE),
        "num_classes": len(class_names)
    }