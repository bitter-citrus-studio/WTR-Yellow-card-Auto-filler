import zipfile
import os

# 1. Get the directory where THIS script is saved
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def create_zip():
    zip_name = input("Enter the name for your zip file: ")
    if not zip_name.endswith('.zip'):
        zip_name += '.zip'

    # List your 'sister' files and folders here
    items_to_zip = ['content.js', 'customiseWindow.html', 'customiseWindow.js', 'manifest.json', 'popup.js', 'popup.html', 'styles.css', 'Icons']

    # Set the output path to be in the same folder as the script
    output_path = os.path.join(SCRIPT_DIR, zip_name)

    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for item in items_to_zip:
            # Create the full path to the sister item
            full_item_path = os.path.join(SCRIPT_DIR, item)
            
            if os.path.isfile(full_item_path):
                # Add file using its name only inside the zip
                zipf.write(full_item_path, item)
                print(f"Added file: {item}")
            
            elif os.path.isdir(full_item_path):
                print(f"Adding folder: {item}...")
                for root, dirs, files in os.walk(full_item_path):
                    for file in files:
                        full_filepath = os.path.join(root, file)
                        # Calculate path relative to the script's directory
                        relative_path = os.path.relpath(full_filepath, SCRIPT_DIR)
                        zipf.write(full_filepath, relative_path)
            else:
                print(f"Skipping {item}: Not found at {full_item_path}")

    print(f"\nSuccess! Archive created at: {output_path}")

if __name__ == "__main__":
    create_zip()