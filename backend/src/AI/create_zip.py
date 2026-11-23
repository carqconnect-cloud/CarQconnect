import os
import zipfile

def make_zip(output_filename="chatbot_project.zip"):
    # Folders to exclude
    exclude_dirs = {"venv", "__pycache__", ".git", ".pytest_cache", ".idea", ".vscode"}
    # Files to exclude (like virtualenv files, existing zips, or secret .env)
    exclude_files = {output_filename, ".DS_Store"}

    with zipfile.ZipFile(output_filename, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk("."):
            dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith(".")]
            for file in files:
                if file in exclude_files or file.endswith(".pyc"):
                    continue
                # Optional: exclude actual .env to avoid sharing secret keys (keep .env.example)
                # If the tester needs .env with test keys, include it
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, ".")
                zipf.write(file_path, arcname)

    size_kb = os.path.getsize(output_filename) / 1024
    print(f"Created {output_filename} ({size_kb:.1f} KB)")

if __name__ == "__main__":
    make_zip()
