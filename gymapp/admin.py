from django.contrib import admin
from django import forms
from django.utils.html import format_html
from .models import UserProfile, Product, Order
from fitai_gym.supabase_utils import upload_to_supabase

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "membership_plan", "fitness_goal", "created_at")
    list_filter = ("membership_plan", "fitness_goal", "gender")
    search_fields = ("user__username", "user__email", "user__first_name", "user__last_name")

class ProductAdminForm(forms.ModelForm):
    image_upload = forms.ImageField(required=False, label="Upload Image", help_text="Upload an image to Supabase")

    class Meta:
        model = Product
        fields = ["name", "description", "price", "stock", "is_active"]

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    form = ProductAdminForm
    list_display = ("name", "price", "stock", "is_active", "created_at", "image_preview")
    list_filter = ("is_active", "created_at")
    search_fields = ("name", "description")
    readonly_fields = ("image_preview",)

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-height: 50px; max-width: 50px; border-radius: 4px;" />', obj.image)
        return "No image"
    image_preview.short_description = "Preview"

    def save_model(self, request, obj, form, change):
        image_upload = form.cleaned_data.get("image_upload")
        if image_upload:
            try:
                image_url = upload_to_supabase(image_upload)
                obj.image = image_url
            except Exception as e:
                self.message_user(request, f"Error uploading image: {e}", level="ERROR")
        super().save_model(request, obj, form, change)

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "quantity", "total_price", "buyer_name", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("buyer_name", "buyer_email", "product__name")
    readonly_fields = ("created_at", "total_price")
    list_editable = ("status",)
