# Keystroke Kingdom - Django Web Application

A Modern Monetary Theory (MMT) economic strategy game built with Django, featuring user authentication, persistent game saves, and a global leaderboard.

## Features

- **Full MMT Economic Simulation**: Manage employment, inflation, and public services over 30 days
- **User Accounts**: Secure authentication via Django admin
- **Persistent Game Saves**: Auto-save every 5 turns, load your progress anytime
- **Global Leaderboard**: Compete with players worldwide
- **Economic Advisor**: AI-powered advisor using Claude API (requires authentication)
- **Mobile Responsive**: Optimized for all devices

## Tech Stack

- **Backend**: Django 5.0, Django REST Framework
- **Database**: PostgreSQL (production), SQLite (development)
- **Frontend**: Vanilla JavaScript, CSS3
- **AI**: Anthropic Claude API
- **Deployment**: Railway

## Local Development

### Prerequisites

- Python 3.11+
- pip
- virtualenv (recommended)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ChrisB2025/Keystroke-Kingdom.git
   cd Keystroke-Kingdom
   ```

2. **Create and activate virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

5. **Generate Django secret key:**
   ```bash
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

   Copy the output and add to `.env`:
   ```
   DJANGO_SECRET_KEY=your-generated-secret-key-here
   DEBUG=True
   ANTHROPIC_API_KEY=your-anthropic-api-key-here
   ```

6. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

7. **Create superuser:**
   ```bash
   python manage.py createsuperuser
   ```

8. **Collect static files:**
   ```bash
   python manage.py collectstatic --noinput
   ```

9. **Run development server:**
   ```bash
   python manage.py runserver
   ```

10. **Access the application:**
    - Game: http://127.0.0.1:8000/
    - Admin: http://127.0.0.1:8000/admin/

## Railway Deployment

### Prerequisites

- GitHub account
- Railway account (https://railway.app)
- Anthropic API key (https://console.anthropic.com/)

### Deployment Steps

1. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "Initial Django deployment"
   git push origin main
   ```

2. **Create new Railway project:**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `Keystroke-Kingdom` repository

3. **Add PostgreSQL database:**
   - In your Railway project, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically inject database credentials

4. **Set environment variables:**

   In Railway project settings, add these variables:

   ```
   DJANGO_SECRET_KEY=<generate-new-secret-key>
   ANTHROPIC_API_KEY=<your-anthropic-api-key>
   DEBUG=False
   ```

   To generate a secret key:
   ```bash
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

5. **Deploy:**
   - Railway will automatically detect the `railway.json` file
   - The build command will run migrations and collect static files
   - The app will start with gunicorn

6. **Create superuser (via Railway CLI):**
   ```bash
   railway login
   railway link
   railway run python manage.py createsuperuser
   ```

   Or use Railway's shell in the dashboard.

7. **Access your application:**
   - Railway will provide a public URL: `https://your-app.railway.app`
   - Admin panel: `https://your-app.railway.app/admin/`

### Post-Deployment

1. **Login to admin panel** using your superuser credentials
2. **Create additional user accounts** for players
3. **Test the game:**
   - Play through a few turns
   - Verify autosave is working
   - Submit a high score
   - Check the leaderboard

## Project Structure

```
keystroke-kingdom/
├── config/                 # Django project configuration
│   ├── settings.py        # Main settings
│   ├── urls.py            # URL routing
│   └── wsgi.py            # WSGI configuration
├── game/                   # Game application
│   ├── models.py          # GameSave and HighScore models
│   ├── views.py           # API views
│   ├── urls.py            # Game URL patterns
│   ├── serializers.py     # DRF serializers
│   └── admin.py           # Django admin configuration
├── static/game/            # Static assets
│   ├── game.js            # Game logic
│   └── game.css           # Game styles
├── templates/game/         # HTML templates
│   └── index.html         # Main game template
├── manage.py               # Django management script
├── requirements.txt        # Python dependencies
├── runtime.txt             # Python version
├── railway.json            # Railway configuration
├── .gitignore              # Git ignore rules
├── .env.example            # Environment template
└── README.md               # This file
```

## API Endpoints

### Authentication Required

- `POST /api/save` - Save game state
- `GET /api/load` - Load saved game
- `POST /api/scores` - Submit high score
- `POST /api/claude` - Claude AI proxy
- `GET /api/stats` - User statistics

### Public

- `GET /api/leaderboard?limit=50` - Get top scores

## Game Mechanics

### Core MMT Principles

1. **Currency Sovereignty**: Government creates currency through spending
2. **Tax Function**: Taxes delete money, don't fund spending
3. **Real Resource Constraint**: Inflation from capacity limits, not money supply
4. **Job Guarantee**: Buffer stock employment at fixed wage
5. **Functional Finance**: Full employment and price stability over balanced budgets

### Win Conditions

Maximize your score by:
- Maintaining high employment (95%+)
- Keeping inflation stable (2-3%)
- Investing in public services
- Building productive capacity

### Actions

- **Treasury**: Tax policy, public spending programs
- **Central Bank**: Interest rates, yield curve control
- **Employment**: Job guarantee, training programs
- **Investment**: Infrastructure, energy, skills, logistics
- **Demand Management**: Fiscal stimulus, transfers
- **Trade**: Export support, domestic industry

## Troubleshooting

### Local Development

**Issue**: `ModuleNotFoundError: No module named 'anthropic'`
```bash
pip install -r requirements.txt
```

**Issue**: `django.db.utils.OperationalError: no such table`
```bash
python manage.py migrate
```

**Issue**: Static files not loading
```bash
python manage.py collectstatic --noinput
```

### Railway Deployment

**Issue**: Build fails
- Check Railway logs in dashboard
- Verify all environment variables are set
- Ensure `requirements.txt` is in root directory

**Issue**: Database connection errors
- Verify PostgreSQL service is running
- Check that database environment variables are injected

**Issue**: Static files not serving
- Run `railway run python manage.py collectstatic`
- Verify WhiteNoise is in INSTALLED_APPS

## Credits

- Game Design: Original Keystroke Kingdom browser game
- Framework: Django, Django REST Framework
- AI: Anthropic Claude API
- Deployment: Railway

## License

Educational purposes - MIT License
