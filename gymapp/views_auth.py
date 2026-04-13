from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from .models import UserProfile

def login_view(request):
    if request.method == 'POST':
        email_or_username = (request.POST.get('email') or '').strip()
        # Normalize emails to lowercase for authentication consistency
        email_or_username_lower = email_or_username.lower()
        password = (request.POST.get('password') or '').strip()
        remember_me = request.POST.get('remember')

        user = None
        # Try authenticate directly using the provided value as username
        if email_or_username_lower:
            user = authenticate(request, username=email_or_username_lower, password=password)
        # If that failed, try looking up by email to retrieve actual username
        if not user and email_or_username_lower:
            try:
                u = User.objects.get(email__iexact=email_or_username_lower)
                user = authenticate(request, username=u.username, password=password)
            except User.DoesNotExist:
                user = None

        if user is not None:
            login(request, user)
            if not remember_me:
                # Set session to expire when browser is closed
                request.session.set_expiry(0)
            return redirect('home')
        else:
            messages.error(request, 'Invalid email or password.')
            return render(request, 'home.html', {'login_error': 'Invalid email or password'})

    return redirect('home')

def logout_view(request):
    logout(request)
    return redirect('home')

def register_view(request):
    if request.method == 'POST':
        try:
            with transaction.atomic():
                # Get form data
                first_name = request.POST.get('fname')
                last_name = request.POST.get('lname')
                email = (request.POST.get('email') or '').strip().lower()
                password = request.POST.get('password')
                compassword = request.POST.get('confirmpassword')
                age = request.POST.get('age')
                gender = request.POST.get('gender')
                height = request.POST.get('height')
                weight = request.POST.get('weight')
                fitness_goal = request.POST.get('fitness_goal')
                membership_plan = request.POST.get('plan')
                
                # Create user
                if User.objects.filter(email__iexact=email).exists():
                    messages.error(request, 'Email already exists.')
                    return render(request, 'home.html', {'registration_error': 'Email already exists'})
                if password != compassword:
                    messages.error(request, 'Passwords do not match.')
                    return render(request, 'home.html', {'registration_error': 'Passwords do not match'})
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name
                )
                user.save()
                # Update or create user profile (signal may have already created one)
                profile, _created = UserProfile.objects.get_or_create(user=user)
                # Coerce numeric fields where provided
                profile.age = int(age) if age else None
                profile.gender = gender or ''
                profile.height = float(height) if height else None
                profile.weight = float(weight) if weight else None
                profile.fitness_goal = fitness_goal or ''
                profile.membership_plan = membership_plan or ''
                profile.save()
                
                # Log the user in
                user = authenticate(username=email, password=password)
                if user is not None:
                    login(request, user)
                    messages.success(request, 'Registration successful! Welcome to FitAI Gym.')
                    return redirect('dashboard')
                
        except Exception as e:
            messages.error(request, f'An error occurred during registration: {str(e)}')
            return render(request, 'home.html', {'registration_error': str(e)})
    
    return redirect('home')
