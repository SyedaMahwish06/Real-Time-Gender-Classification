import os
import shutil

source = "utkface_aligned_cropped/UTKFace"

male_path = "dataset/male"
female_path = "dataset/female"

os.makedirs(male_path, exist_ok=True)
os.makedirs(female_path, exist_ok=True)

for file in os.listdir(source):
    try:
        gender = int(file.split("_")[1])
        src = os.path.join(source, file)

        if gender == 0:
            shutil.copy(src, male_path)
        elif gender == 1:
            shutil.copy(src, female_path)

    except:
        continue

print("Done!")