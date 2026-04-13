from django.shortcuts import render, redirect
import json
import requests
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.models import User
from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_POST
from django import forms
from django.conf import settings
from .models import Product, Order
from django.contrib import messages
from fitai_gym.supabase_utils import upload_to_supabase



from django.views.decorators.csrf import ensure_csrf_cookie

@ensure_csrf_cookie
def home(request):
    return render(request, 'home.html')

def features(request):
    return render(request, 'features.html')

def exercise_predictor(request):
    return render(request, 'exercise_predictor.html')

def diet_predictor(request):
    return render(request, 'diet_predictor.html')

def pricing(request):
    return render(request, 'pricing.html')

def about(request):
    return render(request, 'about.html')

def contact(request):
    return render(request, 'contact.html')

def dashboard(request):
    return render(request, 'dashboard.html')


# Health/aux views
def chrome_devtools_probe(request):
    """Return 204 to silence Chrome DevTools well-known probe logs."""
    return HttpResponse(status=204)


# Shop views
def shop(request):
    products = Product.objects.filter(is_active=True)
    return render(request, 'shop.html', {"products": products})


class ProductForm(forms.ModelForm):
    # Use a FileField for the upload, even though the model uses URLField
    image_file = forms.FileField(
        required=False, 
        widget=forms.ClearableFileInput(attrs={"class": "form-control"})
    )

    class Meta:
        model = Product
        fields = ["name", "description", "price", "stock", "is_active"]
        widgets = {
            "name": forms.TextInput(attrs={"class": "form-control", "placeholder": "Product name"}),
            "description": forms.Textarea(attrs={"class": "form-control", "rows": 4, "placeholder": "Describe the product"}),
            "price": forms.NumberInput(attrs={"class": "form-control", "step": "0.01", "min": "0"}),
            "stock": forms.NumberInput(attrs={"class": "form-control", "min": "0"}),
            "is_active": forms.CheckboxInput(attrs={"class": "form-check-input"}),
        }



@staff_member_required
def add_product(request):
    if request.method == "POST":
        form = ProductForm(request.POST, request.FILES)
        if form.is_valid():
            product = form.save(commit=False)
            
            # Handle Supabase image upload
            image_file = request.FILES.get('image_file')
            if image_file:
                try:
                    image_url = upload_to_supabase(image_file)
                    product.image = image_url
                except Exception as e:
                    messages.error(request, f"Image upload failed: {str(e)}")
                    return render(request, 'admin_add_product.html', {"form": form})
            
            product.save()
            messages.success(request, f"Product '{product.name}' added successfully!")
            return redirect('shop')
        else:
            messages.error(request, "Failed to add product. Please check the errors below.")
    else:
        form = ProductForm()
    return render(request, 'admin_add_product.html', {"form": form})



def login_view(request):
    if request.method == 'POST':
        email_or_username = request.POST.get('email') or request.POST.get('username')
        password = request.POST.get('password')
        user = None
        # Try authenticate by username directly
        user = authenticate(request, username=email_or_username, password=password)
        if not user:
            # Try lookup by email -> username
            try:
                u = User.objects.get(email=email_or_username)
                user = authenticate(request, username=u.username, password=password)
            except User.DoesNotExist:
                user = None
        if user:
            auth_login(request, user)
            return redirect('home')
        # Failed auth: render home with error to show modal error state
        context = { 'login_error': 'Invalid credentials. Please try again.' }
        return render(request, 'home.html', context)
    # Non-POST just redirect
    return redirect('home')


def logout_view(request):
    auth_logout(request)
    return redirect('home')


# API: Exercise recommendations (server-side)
@require_POST
def api_exercise_recommendations(request):
    """
    Accepts POST form data and returns exercise recommendations from API-Ninjas.
    Falls back to deterministic logic if API fails.
    """
    try:
        age = int(request.POST.get('age') or 0)
        gender = (request.POST.get('gender') or '').lower()
        height = float(request.POST.get('height') or 0)
        weight = float(request.POST.get('weight') or 0)
        fitness_level = (request.POST.get('fitness_level') or '').lower()
        goal = (request.POST.get('goal') or '').lower()
        injuries = (request.POST.get('injuries') or '').strip()

        # Guardrails
        if not all([age, gender in ['male', 'female'], height > 0, weight > 0, fitness_level in ['beginner', 'intermediate', 'advanced'], goal]):
            return JsonResponse({'error': 'Invalid input. Fill all required fields.'}, status=400)

        api_key = getattr(settings, 'EXERCISE_API_KEY', '')
        external_success = False
        exercises_list = []

        # Map fitness level and goal to API-Ninjas categories
        diff_map = {'beginner': 'beginner', 'intermediate': 'intermediate', 'advanced': 'expert'}
        type_map = {
            'weight_loss': 'cardio',
            'muscle_gain': 'strength',
            'endurance': 'plyometrics',
            'maintenance': 'stretching'
        }
        
        target_type = type_map.get(goal, 'strength')
        target_difficulty = diff_map.get(fitness_level, 'intermediate')

        if api_key:
            try:
                response = requests.get(
                    f'https://api.api-ninjas.com/v1/exercises?type={target_type}&difficulty={target_difficulty}',
                    headers={'X-Api-Key': api_key},
                    timeout=5
                )
                if response.status_code == 200:
                    api_data = response.json()
                    if api_data:
                        # Normalize external data to match our schema
                        for item in api_data[:5]:
                            exercises_list.append({
                                "name": item.get('name'),
                                "type": item.get('type'),
                                "muscle": item.get('muscle'),
                                "equipment": item.get('equipment'),
                                "difficulty": item.get('difficulty'),
                                "instructions": item.get('instructions')
                            })
                        external_success = True
            except Exception as e:
                print(f"API Error: {e}")

        # Fallback to local logic if external API failed or provided no results
        if not external_success:
            recommended_names = {
                'weight_loss': ['Running', 'Cycling', 'HIIT', 'Jump Rope', 'Swimming'],
                'muscle_gain': ['Squats', 'Bench Press', 'Deadlifts', 'Pull-ups', 'Overhead Press'],
                'endurance': ['Plank', 'Lunges', 'Burpees', 'Mountain Climbers', 'Rowing'],
            }.get(goal, ['Walking', 'Bodyweight Squats', 'Push-ups', 'Crunches', 'Stretching'])

            # Add injury safety
            if 'knee' in injuries.lower() or 'joint' in injuries.lower():
                recommended_names = [r for r in recommended_names if 'running' not in r.lower()]
                recommended_names.append('Swimming') if 'Swimming' not in recommended_names else None

            for name in recommended_names:
                exercises_list.append({
                    "name": name,
                    "type": target_type,
                    "muscle": "full body",
                    "equipment": "none/gym",
                    "difficulty": target_difficulty,
                    "instructions": "Deterministic fallback. Start slow, focus on form."
                })

        # BMI
        height_m = height / 100.0
        bmi = round(weight / (height_m * height_m), 1) if height_m > 0 else None

        return JsonResponse({
            'using_external_api_key': external_success,
            'workout_type': target_type.capitalize(),
            'intensity': target_difficulty.capitalize(),
            'bmi': bmi,
            'exercises': exercises_list,
            'injury_warning': 'Avoid high impact if joint pain persists.' if injuries else '',
            'schedule_note': 'Recommended: 3-5 sessions per week.'
        })
    except Exception as e:
        return JsonResponse({'error': f'Server error: {str(e)}'}, status=500)


# API: Diet recommendations (server-side)
@require_POST
def api_diet_recommendations(request):
    """
    Accepts POST form data and returns diet recommendations from API-Ninjas Nutrition.
    """
    try:
        age = int(request.POST.get('age') or 0)
        gender = (request.POST.get('gender') or '').lower()
        height = float(request.POST.get('height') or 0)
        weight = float(request.POST.get('weight') or 0)
        activity = (request.POST.get('activity') or 'sedentary').lower()
        goal = (request.POST.get('goal') or '').lower()

        if not all([age, gender in ['male', 'female'], height > 0, weight > 0, activity, goal]):
            return JsonResponse({'error': 'Invalid input. Fill all required fields.'}, status=400)

        api_key = getattr(settings, 'DIET_API_KEY', '')
        
        # Calculate Base Calories (Mifflin-St Jeor)
        bmr = (10 * weight + 6.25 * height - 5 * age) + (5 if gender == 'male' else -161)
        factors = {'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55, 'active': 1.725, 'very_active': 1.9}
        tdee = bmr * factors.get(activity, 1.2)
        
        cal_goal = int(tdee - 500 if goal == 'weight_loss' else (tdee + 300 if goal == 'muscle_gain' else tdee))
        
        external_success = False
        meal_components = []

        if api_key:
            # Query API-Ninjas for nutritional info of common healthy foods
            query = "chicken breast, brown rice, broccoli, eggs, oatmeal"
            try:
                response = requests.get(
                    f'https://api.api-ninjas.com/v1/nutrition?query={query}',
                    headers={'X-Api-Key': api_key},
                    timeout=5
                )
                if response.status_code == 200:
                    api_data = response.json()
                    if api_data:
                        meal_components = api_data
                        external_success = True
            except Exception as e:
                print(f"Diet API Error: {e}")

        # Build meals based on results or default
        if not external_success:
            meal_components = [
                {'name': 'Oats/Eggs', 'calories': 300, 'protein_g': 15},
                {'name': 'Chicken/Rice', 'calories': 600, 'protein_g': 40},
                {'name': 'Fish/Veg', 'calories': 500, 'protein_g': 35}
            ]

        meals = [
            {'name': 'Breakfast', 'items': [meal_components[0].get('name')], 'calories': cal_goal // 4},
            {'name': 'Lunch', 'items': [meal_components[1].get('name')], 'calories': cal_goal // 3},
            {'name': 'Dinner', 'items': [meal_components[2].get('name')], 'calories': cal_goal // 3},
        ]

        return JsonResponse({
            'using_external_api_key': external_success,
            'calories': cal_goal,
            'macros': {'protein': int(weight * 1.8), 'carbs': 'Adjust to target', 'fat': int(weight * 0.8)},
            'meals': meals,
            'notes': 'Nutritional data provided by API-Ninjas.' if external_success else 'Calculated fallback.'
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_POST
def place_order(request):
    try:
        product_id = request.POST.get('product_id')
        quantity = int(request.POST.get('quantity') or 1)
        buyer_name = (request.POST.get('buyer_name') or '').strip()
        buyer_email = (request.POST.get('buyer_email') or '').strip()
        buyer_phone = (request.POST.get('buyer_phone') or '').strip()
        shipping_address = (request.POST.get('shipping_address') or '').strip()
        payment_method = (request.POST.get('payment_method') or 'cod').strip()
        transaction_id = (request.POST.get('transaction_id') or '').strip()

        if not all([product_id, quantity > 0, buyer_name, buyer_email, buyer_phone, shipping_address, payment_method]):
            return JsonResponse({'error': 'Please fill all required fields correctly.'}, status=400)

        try:
            product = Product.objects.get(pk=product_id, is_active=True)
        except Product.DoesNotExist:
            return JsonResponse({'error': 'Product not found.'}, status=404)

        if product.stock < quantity:
            return JsonResponse({'error': 'Insufficient stock.'}, status=400)

        total_price = product.price * quantity

        order = Order.objects.create(
            product=product,
            quantity=quantity,
            buyer_name=buyer_name,
            buyer_email=buyer_email,
            buyer_phone=buyer_phone,
            shipping_address=shipping_address,
            total_price=total_price,
            payment_method=payment_method,
            transaction_id=transaction_id if payment_method == 'upi' else None,
        )

        # Decrement stock
        product.stock -= quantity
        product.save(update_fields=['stock'])

        return JsonResponse({
            'success': True,
            'order_id': order.id,
            'total_price': str(total_price),
            'remaining_stock': product.stock,
            'message': 'Order placed successfully.'
        })
    except Exception:
        return JsonResponse({'error': 'Server error while placing order.'}, status=500)


