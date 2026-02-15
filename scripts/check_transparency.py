
import os
from PIL import Image

# Directory containing the icons
icon_dir = "public/assets/icons/lab"

def check_transparency():
    print(f"Scanning directory: {icon_dir}")
    if not os.path.exists(icon_dir):
        print(f"Directory not found: {icon_dir}")
        return

    files = os.listdir(icon_dir)
    print(f"Found files: {files}")

    for filename in files:
        if filename.endswith(".png"):
            file_path = os.path.join(icon_dir, filename)
            try:
                img = Image.open(file_path)
                print(f"Checking {filename}...")
                print(f"  Mode: {img.mode}")
                
                if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                    # Check corner pixels for transparency
                    corners = [
                        (0, 0),
                        (0, img.height - 1),
                        (img.width - 1, 0),
                        (img.width - 1, img.height - 1)
                    ]
                    
                    is_transparent = False
                    for x, y in corners:
                        pixel = img.getpixel((x, y))
                        # In RGBA, the last value is Alpha. 0 is fully transparent.
                        if len(pixel) == 4 and pixel[3] == 0:
                            is_transparent = True
                            print(f"  Corner ({x}, {y}) is transparent: {pixel}")
                        else:
                             print(f"  Corner ({x}, {y}) is NOT transparent: {pixel}")
                    
                    if not is_transparent:
                         # Check if it has ANY transparency
                         extrema = img.getextrema()
                         if extrema and len(extrema) > 3:
                             alpha_extrema = extrema[3]
                             print(f"  Alpha range: {alpha_extrema}")
                             if alpha_extrema[0] < 255:
                                 print("  Image has some transparency.")
                             else:
                                 print("  Image has NO transparency (Alpha channel is full opaque).")
                else:
                    print("  Image mode does not support transparency or no transparency info.")
                    
            except Exception as e:
                print(f"Failed to check {filename}: {e}")

if __name__ == "__main__":
    check_transparency()
