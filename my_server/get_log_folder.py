import csv
import os
import shutil
import requests
from urllib.parse import urlparse
from pathlib import Path
import argparse


def download_image(url, folder_path):
    """Download an image from a URL and save it to a specified folder."""
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()  # Check for request errors

        # Parse the filename from URL
        filename = os.path.basename(urlparse(url).path)
        file_path = os.path.join(folder_path, filename)

        with open(file_path, 'wb') as out_file:
            shutil.copyfileobj(response.raw, out_file)
        return file_path
    except requests.RequestException as e:
        print(f"Error downloading {url}: {e}")
        return None

def process_csv(csv_file_path, images_folder):
    """Process each row in the CSV file and download the image."""
    if not os.path.exists(images_folder):
        os.makedirs(images_folder)  # Create the directory if it doesn't exist

    with open(csv_file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.reader(csvfile)
        next(reader)  # Skip the header row
        for row in reader:
            for value in row:
                if value.lower().endswith(".png"):  # Check if the value ends with .png
                    print(f"Checking image URL {value}")
                    download_image(value, images_folder)
                    
# Set up argument parsing
parser = argparse.ArgumentParser(description='Process a CSV file and download images based on a specific date.')
parser.add_argument('date', type=str, help='Date in the format YYYY-MM-DD for which to process the CSV file.')
args = parser.parse_args()


main_csv = "/data/silama3/my_server/logs/" + args.date + '/'
# Path to the CSV file
csv_file_path = main_csv + 'log.csv'
# Folder to store downloaded images
images_folder = main_csv + '/downloaded_images'


process_csv(csv_file_path, images_folder)
