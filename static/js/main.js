// Premium UI Enhancements
document.addEventListener('DOMContentLoaded', function() {
  // Intersection Observer for Scroll Animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const appearanceObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        // Once animated, no need to observe again
        appearanceObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  animatedElements.forEach(el => appearanceObserver.observe(el));

  // Navbar Scroll Effect
  const navbar = document.querySelector('.floating-navbar');
  window.addEventListener('scroll', () => {
    if (navbar) {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
  });

  // Setup form handlers
  const exerciseForm = document.getElementById('exerciseForm');
  if (exerciseForm) {
    exerciseForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const results = document.getElementById('exerciseResults');
      if (results) {
        results.innerHTML = '<div class="text-center text-muted">Generating your recommendations...</div>';
      }
      try {
        const formData = new FormData();
        formData.append('age', document.getElementById('exAge').value);
        formData.append('gender', document.getElementById('exGender').value);
        formData.append('height', document.getElementById('exHeight').value);
        formData.append('weight', document.getElementById('exWeight').value);
        formData.append('fitness_level', document.getElementById('exFitnessLevel').value);
        formData.append('goal', document.getElementById('exGoal').value);
        formData.append('injuries', document.getElementById('exInjuries').value || '');

        const resp = await fetch('/api/exercise-recommendations/', {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken()
          },
          body: formData
        });
        const data = await resp.json();
        if (!resp.ok || data.error) {
          throw new Error(data.error || 'Failed to generate recommendations');
        }
        renderExerciseResults(data);
      } catch (err) {
        // Fallback to client-side estimation
        predictExercise();
      }
    });
  }
  
  const dietForm = document.getElementById('dietForm');
  if (dietForm) {
    dietForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const results = document.getElementById('dietResults');
      if (results) results.innerHTML = '<div class="text-center text-muted">Generating your diet plan...</div>';
      try {
        const formData = new FormData();
        formData.append('age', document.getElementById('dietAge').value);
        formData.append('gender', document.getElementById('dietGender').value);
        formData.append('height', document.getElementById('dietHeight').value);
        formData.append('weight', document.getElementById('dietWeight').value);
        formData.append('activity', document.getElementById('dietActivity').value);
        formData.append('goal', document.getElementById('dietGoal').value);
        if (document.getElementById('dietPreferences')) {
          formData.append('preferences', document.getElementById('dietPreferences').value || '');
        }
        // Optional foods JSON from hidden field
        const foodsJsonEl = document.getElementById('foodsJson');
        if (foodsJsonEl && foodsJsonEl.value) {
          formData.append('foods_json', foodsJsonEl.value);
        }

        const resp = await fetch('/api/diet-recommendations/', {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken()
          },
          body: formData
        });
        const data = await resp.json();
        if (!resp.ok || data.error) throw new Error(data.error || 'Failed to generate diet plan');
        renderDietResults(data);
      } catch (err) {
        // Fallback to client-side estimation
        predictDiet();
      }
    });
  }
    // Initialize tooltips/scroll effects as needed
    // initDashboardCharts has been removed as the dashboard is now management-only

  // Hook up pricing plan buttons to open register modal with preselected plan
  document.querySelectorAll('.select-plan-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Allow modal to render first
      setTimeout(() => {
        const select = document.getElementById('plan');
        if (select && btn.dataset.plan) {
          select.value = btn.dataset.plan;
        }
        // Move to payment step if tabs exist
        const paymentTab = document.getElementById('pills-payment-tab');
        if (paymentTab) paymentTab.click();
      }, 150);
    });
  });

  // Shop: Buy Now -> open order modal
  document.querySelectorAll('.buy-now-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.productId;
      const name = btn.dataset.productName;
      const price = btn.dataset.productPrice;
      const stock = parseInt(btn.dataset.productStock || '0', 10);

      const idEl = document.getElementById('orderProductId');
      const nameEl = document.getElementById('orderProductName');
      const priceEl = document.getElementById('orderProductPrice');
      const stockEl = document.getElementById('orderProductStock');
      const qtyEl = document.getElementById('orderQuantity');
      const alertEl = document.getElementById('orderAlert');

      if (!idEl) return; // modal not on this page
      idEl.value = pid;
      if (nameEl) nameEl.textContent = name;
      if (priceEl) priceEl.textContent = price;
      if (stockEl) stockEl.textContent = stock;
      if (qtyEl) {
        qtyEl.max = String(stock);
        qtyEl.value = '1';
      }
      if (alertEl) {
        alertEl.classList.add('d-none');
        alertEl.classList.remove('alert-success', 'alert-danger');
        alertEl.textContent = '';
      }

      if (window.bootstrap) {
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('orderModal'));
        modal.show();
      }
    });
  });

  // Toggle UPI details in shop modal
  const paymentMethodSelect = document.getElementById('paymentMethod');
  if (paymentMethodSelect) {
    paymentMethodSelect.addEventListener('change', function() {
      const upiDetails = document.getElementById('upiDetails');
      if (upiDetails) {
        if (this.value === 'upi') {
          upiDetails.classList.remove('d-none');
          upiDetails.classList.add('animate-in'); // assuming some animation
        } else {
          upiDetails.classList.add('d-none');
        }
      }
    });
  }

  // Submit order
  const submitOrderBtn = document.getElementById('submitOrderBtn');
  if (submitOrderBtn) {
    submitOrderBtn.addEventListener('click', async () => {
      const idEl = document.getElementById('orderProductId');
      const qtyEl = document.getElementById('orderQuantity');
      const nameEl = document.getElementById('buyerName');
      const emailEl = document.getElementById('buyerEmail');
      const phoneEl = document.getElementById('buyerPhone');
      const addrEl = document.getElementById('shippingAddress');
      const alertEl = document.getElementById('orderAlert');
      const stockEl = document.getElementById('orderProductStock');

      if (!idEl) return;
      const formData = new FormData();
      formData.append('product_id', idEl.value);
      formData.append('quantity', (qtyEl && qtyEl.value) || '1');
      formData.append('buyer_name', (nameEl && nameEl.value) || '');
      formData.append('buyer_email', (emailEl && emailEl.value) || '');
      formData.append('buyer_phone', (phoneEl && phoneEl.value) || '');
      formData.append('shipping_address', (addrEl && addrEl.value) || '');
      const payEl = document.getElementById('paymentMethod');
      formData.append('payment_method', (payEl && payEl.value) || 'cod');
      const transEl = document.getElementById('transactionId');
      if (transEl && (payEl && payEl.value === 'upi')) {
        formData.append('transaction_id', transEl.value || '');
      }

      // UI state
      submitOrderBtn.disabled = true;
      submitOrderBtn.textContent = 'Placing...';
      if (alertEl) {
        alertEl.classList.add('d-none');
        alertEl.classList.remove('alert-success', 'alert-danger');
        alertEl.textContent = '';
      }

      try {
        const resp = await fetch('/api/place-order/', {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken(),
          },
          body: formData,
        });
        const data = await resp.json();
        if (!resp.ok || data.error) throw new Error(data.error || 'Failed to place order');

        // Success
        if (alertEl) {
          alertEl.classList.remove('d-none');
          alertEl.classList.add('alert', 'alert-success');
          alertEl.textContent = data.message || 'Order placed successfully';
        }

        // Update stock in modal and product card button
        const remaining = parseInt(data.remaining_stock, 10);
        if (stockEl) stockEl.textContent = isNaN(remaining) ? stockEl.textContent : String(remaining);

        // Find the product button on the card and update
        const pid = idEl.value;
        const cardBtn = document.querySelector(`.buy-now-btn[data-product-id="${pid}"]`);
        if (cardBtn) {
          cardBtn.dataset.productStock = String(remaining);
          if (remaining <= 0) {
            const parent = cardBtn.parentElement;
            cardBtn.remove();
            if (parent) {
              const badge = document.createElement('span');
              badge.className = 'badge bg-secondary';
              badge.textContent = 'Out of stock';
              parent.appendChild(badge);
            }
          }
        }

        // Close modal after a short delay
        setTimeout(() => {
          if (window.bootstrap) {
            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('orderModal'));
            modal.hide();
          }
        }, 900);
      } catch (err) {
        if (alertEl) {
          alertEl.classList.remove('d-none');
          alertEl.classList.add('alert', 'alert-danger');
          alertEl.textContent = err.message || 'Failed to place order';
        }
      } finally {
        submitOrderBtn.disabled = false;
        submitOrderBtn.textContent = 'Place Order';
      }
    });
  }
  // Login modal: open Register from Login
  const openRegisterFromLogin = document.getElementById('openRegisterFromLogin');
  if (openRegisterFromLogin) {
    openRegisterFromLogin.addEventListener('click', () => {
      const loginModalEl = document.getElementById('loginModal');
      const registerModalEl = document.getElementById('registerModal');
      if (loginModalEl && window.bootstrap) {
        const loginModal = bootstrap.Modal.getOrCreateInstance(loginModalEl);
        loginModal.hide();
      }
      if (registerModalEl && window.bootstrap) {
        const registerModal = bootstrap.Modal.getOrCreateInstance(registerModalEl);
        registerModal.show();
        const personalTab = document.getElementById('pills-personal-tab');
        if (personalTab) personalTab.click();
      }
    });
  }
});

// Tab navigation for registration form (guarded for multi-page)

// Tab navigation for registration form (guarded for multi-page)
const btnNextToBody = document.getElementById('nextToBody');
if (btnNextToBody) {
  btnNextToBody.addEventListener('click', function() {
    const tab = document.getElementById('pills-body-tab');
    if (tab) tab.click();
  });
}

const btnNextToPayment = document.getElementById('nextToPayment');
if (btnNextToPayment) {
  btnNextToPayment.addEventListener('click', function() {
    const tab = document.getElementById('pills-payment-tab');
    if (tab) tab.click();
  });
}

const btnBackToPersonal = document.getElementById('backToPersonal');
if (btnBackToPersonal) {
  btnBackToPersonal.addEventListener('click', function() {
    const tab = document.getElementById('pills-personal-tab');
    if (tab) tab.click();
  });
}

const btnBackToBody = document.getElementById('backToBody');
if (btnBackToBody) {
  btnBackToBody.addEventListener('click', function() {
    const tab = document.getElementById('pills-body-tab');
    if (tab) tab.click();
  });
}

// Exercise prediction function
function predictExercise() {
  const age = document.getElementById('exAge').value;
  const gender = document.getElementById('exGender').value;
  const height = document.getElementById('exHeight').value;
  const weight = document.getElementById('exWeight').value;
  const fitnessLevel = document.getElementById('exFitnessLevel').value;
  const goal = document.getElementById('exGoal').value;
  const injuries = document.getElementById('exInjuries').value || '';

  let intensity = fitnessLevel === 'beginner' ? 'Low to Moderate' : (fitnessLevel === 'intermediate' ? 'Moderate' : 'Moderate to High');
  let workoutType = 'Balanced workout';
  let recommendedExercises = ['Full-body strength training', 'Moderate cardio', 'Flexibility exercises', 'Functional training', 'Core workouts'];
  if (goal === 'weight_loss') {
    workoutType = 'Cardio-focused with strength training';
    recommendedExercises = ['Running or jogging (30 mins)', 'Cycling (30 mins)', 'HIIT workouts (20 mins)', 'Swimming (30 mins)', 'Bodyweight circuits'];
  } else if (goal === 'muscle_gain') {
    workoutType = 'Strength training with cardio';
    recommendedExercises = compoundLiftsArr();
  } else if (goal === 'endurance') {
    workoutType = 'Endurance training';
    recommendedExercises = ['Long-distance running', 'Cycling', 'Swimming laps', 'Circuit training', 'Interval training'];
  }

  let injuryWarning = '';
  if (injuries.toLowerCase().includes('knee') || injuries.toLowerCase().includes('joint')) {
    injuryWarning = 'Based on your injury information, we recommend low-impact exercises and consulting with a physical therapist.';
    recommendedExercises = recommendedExercises.filter(ex => !ex.toLowerCase().includes('running') && !ex.toLowerCase().includes('jump'));
    ['Swimming', 'Elliptical training', 'Cycling', 'Rowing'].forEach(alt => {
      if (!recommendedExercises.includes(alt)) recommendedExercises.push(alt);
    });
  }

  const heightInMeters = height / 100;
  const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);

  renderExerciseResults({
    workout_type: workoutType,
    intensity,
    bmi: Number(bmi),
    injury_warning: injuryWarning,
    recommendations: recommendedExercises,
    schedule_note: 'We recommend 4-5 days of exercise per week with rest days in between.'
  });
}

function compoundLiftsArr() {
    return ['Compound lifts (squats, deadlifts, bench press)', 'Isolation exercises', 'Progressive overload training', 'Resistance band workouts', 'Pyramid sets'];
}

function renderExerciseResults(data) {
  const exercisesHTML = Array.isArray(data.exercises) && data.exercises.length ? `
      <h5 class="mt-4">Exercise Details:</h5>
      <div class="list-group">
        ${data.exercises.map(ex => `
          <div class="list-group-item glass-card mb-2">
            <div class="d-flex w-100 justify-content-between">
              <h6 class="mb-1">${ex.name}</h6>
              <span class="badge bg-primary text-capitalize">${ex.difficulty || ''}</span>
            </div>
            <small class="text-muted text-capitalize">Type: ${ex.type || '-'} • Muscle: ${ex.muscle || '-'} • Equipment: ${ex.equipment || '-'}</small>
            <p class="mb-1 mt-2 text-muted">${ex.instructions || ''}</p>
          </div>
        `).join('')}
      </div>
    ` : '';

  const recommendationsHTML = (!Array.isArray(data.exercises) || !data.exercises.length) && Array.isArray(data.recommendations) && data.recommendations.length ? `
      <h5 class="mt-4">Recommended Exercises:</h5>
      <ul class="text-muted">
        ${data.recommendations.map(ex => `<li>${ex}</li>`).join('')}
      </ul>
    ` : '';

  const resultsHTML = `
    <div class="result-card glass-card">
      <h4>Your Exercise Plan</h4>
      <p><strong>Workout Type:</strong> ${data.workout_type}</p>
      <p><strong>Intensity Level:</strong> ${data.intensity}</p>
      ${data.bmi ? `<p><strong>Your BMI:</strong> ${data.bmi} (${getBMICategory(data.bmi)})</p>` : ''}
      ${recommendationsHTML}  
      ${exercisesHTML}
      <h5 class="mt-4">Weekly Schedule:</h5>
      <p class="text-muted">${data.schedule_note}</p>
      ${data.injury_warning ? `<div class="alert alert-warning mt-3 bg-dark border-warning text-warning">${data.injury_warning}</div>` : ''}
    </div>
  `;
  const el = document.getElementById('exerciseResults');
  if (el) el.innerHTML = resultsHTML;
}

function getCSRFToken() {
  const name = 'csrftoken=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
}

// Diet prediction function
function predictDiet() {
  const age = document.getElementById('dietAge').value;
  const gender = document.getElementById('dietGender').value;
  const height = document.getElementById('dietHeight').value;
  const weight = document.getElementById('dietWeight').value;
  const activity = document.getElementById('dietActivity').value;
  const goal = document.getElementById('dietGoal').value;
  const preferences = document.getElementById('dietPreferences').value;
  
  let bmr;
  if (gender === 'male') {
      bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
      bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }
  
  let activityMultiplier;
  switch(activity) {
      case 'sedentary': activityMultiplier = 1.2; break;
      case 'light': activityMultiplier = 1.375; break;
      case 'moderate': activityMultiplier = 1.55; break;
      case 'active': activityMultiplier = 1.725; break;
      case 'very_active': activityMultiplier = 1.9; break;
      default: activityMultiplier = 1.2;
  }
  
  let tdee = bmr * activityMultiplier;
  let calorieAdjustment = 0;
  let proteinRatio = 0.3;
  let carbRatio = 0.4;
  let fatRatio = 0.3;
  
  if (goal === 'weight_loss') {
      calorieAdjustment = -500;
      proteinRatio = 0.4;
      carbRatio = 0.3;
      fatRatio = 0.3;
  } else if (goal === 'muscle_gain') {
      calorieAdjustment = 500;
      proteinRatio = 0.35;
      carbRatio = 0.4;
      fatRatio = 0.25;
  }
  
  const dailyCalories = Math.round(tdee + calorieAdjustment);
  const proteinGrams = Math.round((dailyCalories * proteinRatio) / 4);
  const carbGrams = Math.round((dailyCalories * carbRatio) / 4);
  const fatGrams = Math.round((dailyCalories * fatRatio) / 9);
  
  let mealSuggestions = preferences === 'vegetarian' ? 
    ['Breakfast: Greek yogurt with berries and nuts', 'Lunch: Quinoa salad with chickpeas', 'Dinner: Tofu stir-fry', 'Snacks: Hummus, fruit'] :
    ['Breakfast: Eggs with avocado', 'Lunch: Grilled chicken with quinoa', 'Dinner: Baked salmon', 'Snacks: Protein shake, nuts'];
  
  const resultsHTML = `
      <div class="result-card glass-card">
          <h4>Your Personalized Diet Plan</h4>
          <p><strong>Daily Calorie Target:</strong> ${dailyCalories} calories</p>
          <h5 class="mt-4">Macronutrients:</h5>
          <ul class="text-muted">
              <li>Protein: ${proteinGrams}g</li>
              <li>Carbs: ${carbGrams}g</li>
              <li>Fats: ${fatGrams}g</li>
          </ul>
          <h5 class="mt-4">Meal Suggestions:</h5>
          <ul class="text-muted">
              ${mealSuggestions.map(meal => `<li>${meal}</li>`).join('')}
          </ul>
      </div>
  `;
  
  document.getElementById('dietResults').innerHTML = resultsHTML;
}

// Helper function to get BMI category
function getBMICategory(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

// Render diet plan from API
function renderDietResults(data) {
  const foods = Array.isArray(data.foods) ? data.foods : [];
  const foodsHTML = foods.length ? `
    <h5 class="mt-3">Food Details</h5>
    <div class="table-responsive glass-card mt-3">
      <table class="table table-dark table-hover mb-0">
        <thead>
          <tr>
            <th>Food</th>
            <th>Cal</th>
            <th>Pro(g)</th>
            <th>Carb(g)</th>
            <th>Fat(g)</th>
          </tr>
        </thead>
        <tbody>
          ${foods.map(f => `
            <tr>
              <td>${f.name}</td>
              <td>${f.calories ?? '-'}</td>
              <td>${f.protein_g ?? '-'}</td>
              <td>${f.carbohydrates_total_g ?? '-'}</td>
              <td>${f.fat_total_g ?? '-'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '';

  const resultsHTML = `
    <div class="result-card glass-card">
      <h4>Your Personalized Diet Plan</h4>
      <p><strong>Daily Calorie Target:</strong> ${data.calories} calories</p>
      <h5 class="mt-4">Macronutrient Breakdown:</h5>
      <ul class="text-muted">
        <li><strong>Protein:</strong> ${data.macros?.protein_g ?? 0}g</li>
        <li><strong>Carbohydrates:</strong> ${data.macros?.carbs_g ?? 0}g</li>
        <li><strong>Fats:</strong> ${data.macros?.fat_g ?? 0}g</li>
      </ul>
      <h5 class="mt-4">Daily Meal Plan:</h5>
      <ul class="text-muted">
        ${Array.isArray(data.meals) ? data.meals.map(m => `<li>${m}</li>`).join('') : ''}
      </ul>
      ${foodsHTML}
      <div class="alert alert-info mt-3 bg-dark border-info text-info">
        <i class="fas fa-info-circle me-2"></i>
        ${data.notes || 'Adjust portions based on hunger, recovery, and progress.'}
      </div>
    </div>
  `;
  const el = document.getElementById('dietResults');
  if (el) el.innerHTML = resultsHTML;
}