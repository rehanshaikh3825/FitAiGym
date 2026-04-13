import json
import time
import requests
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
@require_POST
def chat_api(request):
    """
    FitAI Chatbot backend using Gemini API
    """

    try:
        # 1. Parse Input
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        user_message = data.get('message', '').strip()
        if not user_message:
            return JsonResponse({'error': 'Message is required'}, status=400)

        # 2. API Key
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key:
            return JsonResponse({'error': 'Gemini API key not found'}, status=500)

        # ✅ Use stable model
        model = "gemini-2.5-flash"

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        headers = {'Content-Type': 'application/json'}

        # 3. System Instruction
        system_context = (
            "You are a professional FitAI Gym Coach. "
            "IMPORTANT: Only answer questions related to fitness, gym, exercise, nutrition, and health. "
            "If the user asks anything else, politely refuse. "
            "Be helpful, encouraging, and clear."
        )

        # ✅ Correct Gemini payload structure
        payload = {
            "systemInstruction": {
                "parts": [{"text": system_context}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_message}]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 800
            }
        }

        # 4. Call API with retry
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)

            # Retry once if 503
            if response.status_code == 503:
                print("Retrying due to 503...")
                time.sleep(2)
                response = requests.post(url, headers=headers, json=payload, timeout=30)

        except requests.exceptions.RequestException as e:
            return JsonResponse({'error': f'Request failed: {str(e)}'}, status=503)

        # 5. Handle API errors
        if response.status_code != 200:
            print("Gemini Error:", response.status_code, response.text)
            return JsonResponse({
                'error': f'AI Service error ({response.status_code})',
                'details': response.text
            }, status=response.status_code)

        # 6. Parse Response
        result = response.json()

        try:
            bot_text = result['candidates'][0]['content']['parts'][0]['text']
            return JsonResponse({'response': bot_text})

        except (KeyError, IndexError, TypeError):
            print("Parsing Error:", result)
            return JsonResponse({
                'error': 'Failed to parse AI response',
                'raw': result
            }, status=500)

    except Exception as e:
        print("Server Error:", str(e))
        return JsonResponse({'error': f'Server internal error: {str(e)}'}, status=500)