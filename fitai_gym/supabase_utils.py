import os
import uuid
from supabase import create_client, Client
from django.conf import settings

def get_supabase_client() -> Client:
    """
    Initializes and returns a Supabase client.
    """
    url: str = settings.SUPABASE_URL
    key: str = settings.SUPABASE_KEY
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables.")
    return create_client(url, key)

def upload_to_supabase(file):
    """
    Uploads a file to Supabase Storage and returns the public URL.
    """
    bucket_name = getattr(settings, 'SUPABASE_BUCKET', 'media')
    supabase = get_supabase_client()
    
    # Generate a unique filename using UUID
    ext = os.path.splitext(file.name)[1]
    file_name = f"{uuid.uuid4()}{ext}"
    
    # Upload the file
    file.seek(0)
    file_content = file.read()
    
    try:
        supabase.storage.from_(bucket_name).upload(
            path=file_name,
            file=file_content,
            file_options={"cache-control": "3600", "upsert": "true"}
        )
    except Exception as e:
        # Provide a more helpful error if bucket is missing
        if 'Bucket not found' in str(e):
            raise Exception(f"Supabase bucket '{bucket_name}' not found. Please create a PUBLIC bucket named '{bucket_name}' in your Supabase Storage dashboard.")
        raise e
    
    # Return the public URL
    res = supabase.storage.from_(bucket_name).get_public_url(file_name)
    return res
