
import os
import base64
from PIL import Image

# Directory containing the icons
icon_dir = "public/assets/icons/lab"

def convert_png_to_svg():
    print(f"Scanning directory for PNGs: {icon_dir}")
    if not os.path.exists(icon_dir):
        print(f"Directory not found: {icon_dir}")
        return

    files = os.listdir(icon_dir)
    
    for filename in files:
        if filename.endswith(".png"):
            base_name = filename.replace(".png", "")
            if "removebg" in base_name: 
                # Should not happen as we renamed them, but just in case
                continue

            svg_filename = f"{base_name}.svg"
            png_path = os.path.join(icon_dir, filename)
            svg_path = os.path.join(icon_dir, svg_filename)
            
            print(f"Re-converting {filename} to {svg_filename}...")
            
            try:
                # Read image dimensions to set viewBox exactly
                with Image.open(png_path) as img:
                    width, height = img.size
                
                with open(png_path, "rb") as img_file:
                    img_data = img_file.read()
                    base64_data = base64.b64encode(img_data).decode("utf-8")
                
                # Create SVG with exact dimensions and no background
                # Added 'overflow="visible"' and explicit dimensions
                svg_content = f'''<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <image width="{width}" height="{height}" href="data:image/png;base64,{base64_data}" />
</svg>'''
                
                with open(svg_path, "w") as svg_file:
                    svg_file.write(svg_content)
                    
                print(f"Successfully re-created {svg_filename} ({width}x{height})")
                
            except Exception as e:
                print(f"Failed to convert {filename}: {e}")

if __name__ == "__main__":
    convert_png_to_svg()
