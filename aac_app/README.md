# Web-Based AAC App for Elderly Users

This is a complete, working web application tailored for elderly users to assist with communication. It features a simple, mobile-optimized design with large buttons, large text, and high contrast (Yellow background, Black text), along with integrated Text-to-Speech (gTTS) for both Thai and Malay.

## Project Structure
```text
aac_app/
│
├── app.py                   # Main Flask application backend
├── requirements.txt         # Python dependencies
├── data/
│   └── vocabulary.json      # JSON data for words, translations, and images
├── templates/
│   └── index.html           # Main HTML structure
└── static/
    ├── css/
    │   └── style.css        # Stylesheet (Responsive, Mobile-first)
    ├── js/
    │   └── script.js        # Frontend logic (Navigation, Audio playback)
    └── audio/               # Auto-generated folder for caching audio
```

## Setup Instructions

1. **Install Python**: Ensure you have Python 3.8+ installed.
2. **Create a Virtual Environment (Optional but recommended)**:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

1. Start the Flask server:
   ```bash
   python app.py
   ```
2. Open your web browser and go to:
   ```
   http://127.0.0.1:5000/
   ```

## Key Features

- **No Database**: All vocabulary and categories are managed cleanly within `data/vocabulary.json`.
- **Text-to-Speech**: Clicking any card immediately plays audio via the `/speak` endpoint using `gTTS`. Audio files are cached to improve speed on subsequent clicks.
- **Language Support**: Seamlessly toggle between Thai (th) and Malay (ms) from the home page.
- **Elderly-Friendly UI**: Enforces high contrast, large text (28px+), big responsive grid buttons, and a persistent "Back" / "Home" navigation flow.
- **Text Input**: Includes a simple screen where users can type any message and press "Play Voice".
