<div align="center">

# 🎬 Flux

**A modern streaming platform UI built with React, TypeScript, and Vite**

[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/Ennyw/flux?style=social)](https://github.com/Ennyw/flux)
[![GitHub Forks](https://img.shields.io/github/forks/Ennyw/flux?style=social)](https://github.com/Ennyw/flux)

**Netflix-Inspired UI • 75K+ Movies & TV Shows • Educational Demo Project**

[🚀 Quick Start](#-quick-start) • [✨ Features](#-features) • [📚 Documentation](#-documentation) • [🤝 Contributing](#-contributing)

[![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?logo=react)](https://reactjs.org/)
[![Educational Purpose](https://img.shields.io/badge/Purpose-Educational-blue)](DISCLAIMER.md)

</div>

---

## ✨ Features

- 🎬 **75,000+ Titles** - Access movies and TV shows via TMDB API
- 🎨 **Premium UI/UX** - Netflix-inspired design with smooth animations
- 🔍 **Advanced Search** - Search by title, actor, or genre with real-time results
- 📱 **Fully Responsive** - Perfect on desktop, tablet, and mobile
- 💾 **Smart Progress** - Auto-save watch progress and resume anywhere
- 🎯 **No Backend** - Runs entirely client-side, no server needed
- 🚀 **Lightning Fast** - Built with Vite for instant hot reload
- 🔒 **Privacy First** - No tracking, no accounts, localStorage only
- ⚡ **Type-Safe** - Full TypeScript support
- 🎭 **Actor Profiles** - Browse content by your favorite actors
- 🏆 **Top 10** - See trending content ranked daily
- 🎪 **Live Sports** - Stream live sports events (optional)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A free TMDB API key ([get one here](https://www.themoviedb.org/settings/api))

### Installation

```bash
# Clone the repository
git clone https://github.com/enyw/flux.git
cd flux

# Install dependencies (auto-creates .env file)
npm install

# Add your TMDB API key to .env
# Edit .env and replace 'your_tmdb_api_key_here' with your actual key

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start streaming! 🎉

### One-Line Setup

```bash
npm install && echo "VITE_TMDB_API_KEY=your_key_here" > .env && npm run dev
```


## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** CSS3 (Custom properties, Grid, Flexbox)
- **Animations:** Framer Motion, CSS Transitions
- **Routing:** React Router v6
- **API:** TMDB (The Movie Database), TheSportsDB
- **Video:** Vidking Player API
- **Storage:** localStorage (watch progress, my list)

## 📁 Project Structure

```
flux/
├── src/
│   ├── components/       # React components
│   │   ├── Navbar.tsx    # Navigation bar
│   │   ├── Hero.tsx      # Hero banner with slides
│   │   ├── ContentCard.tsx
│   │   ├── PlayerModal.tsx
│   │   └── ...
│   ├── pages/            # Page components
│   │   ├── SearchPage.tsx
│   │   └── SportsPage.tsx
│   ├── utils/            # Utilities
│   │   ├── tmdb.ts       # TMDB API client
│   │   ├── vidking.ts    # Video player integration
│   │   └── storage.ts    # localStorage helpers
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript definitions
│   └── App.tsx           # Main app component
├── scripts/
│   └── setup.js          # Auto-setup script
├── .env.example          # Environment variables template
└── README.md
```

## 🔑 Environment Variables

Create a `.env` file in the root directory:

```env
# Required: TMDB API Key
VITE_TMDB_API_KEY=your_tmdb_api_key_here

# Optional: Sports features
VITE_SPORTSDB_API_KEY=your_sportsdb_key_here

# Optional: Custom streams API
VITE_STREAMS_API_URL=https://ppv.to
```

**🔒 Security:** The `.env` file is automatically ignored by git. Your keys stay private!

## 📚 Documentation

- **[Setup Guide](GITHUB_SETUP.md)** - Detailed GitHub publishing guide
- **[TMDB Setup](SETUP_TMDB.md)** - TMDB API configuration
- **[Sports Setup](SPORTS_API_SETUP.md)** - Sports streaming setup
- **[Contributing](CONTRIBUTING.md)** - How to contribute

## 🎨 Customization

### Change Theme Colors

Edit `src/index.css`:

```css
:root {
  --primary: #e50914;        /* Main brand color */
  --secondary: #8a2be2;      /* Accent color */
  --background: #0a0a0a;     /* Background */
}
```

### Add Custom Content

Content is fetched dynamically from TMDB API. To customize featured content, edit `src/App.tsx` where content is loaded.

## 🌐 Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

### Netlify

```bash
npm run build
# Drag and drop dist/ folder to Netlify
```

### GitHub Pages

```bash
npm run build
# Configure GitHub Pages to serve dist/ folder
```

**Note:** Don't forget to add your environment variables in your hosting platform's settings!

## 🧪 Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Get local IP (for network sharing)
npm run get-ip
```

## 📊 Performance

- ⚡ **First Contentful Paint:** < 1s
- 🚀 **Time to Interactive:** < 2s
- 📦 **Bundle Size:** ~150KB (gzipped)
- 🎯 **Lighthouse Score:** 95+

## 🔒 Privacy & Security

- ✅ No user accounts or authentication
- ✅ No backend server - runs entirely client-side
- ✅ No tracking or analytics
- ✅ localStorage only - your data stays on your device
- ✅ API keys protected - never committed to git
- ✅ GDPR compliant - no data collection

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) - Movie and TV show data
- [TheSportsDB](https://www.thesportsdb.com/) - Sports data
- [Vidking](https://www.vidking.net/) - Video streaming API
- Netflix - Design inspiration

## ⚠️ Disclaimer & Legal Notice

**This project is for educational and demonstration purposes only.**

- 🎓 **Educational Purpose**: This is a UI/UX demonstration project showcasing modern web development techniques
- 🎨 **Netflix Clone**: Inspired by Netflix's design, this is a frontend-only clone focusing on user interface and experience
- 📚 **Learning Project**: Intended for developers to learn React, TypeScript, and API integration
- ⚖️ **Legal Compliance**: Users are responsible for ensuring compliance with all applicable laws and terms of service
- 🚫 **No Content Hosting**: This application does not host, store, or distribute any copyrighted content
- 🔗 **Third-Party APIs**: Uses publicly available APIs (TMDB, TheSportsDB) for metadata only
- 📺 **Streaming Services**: Video playback is handled by third-party services (Vidking API)
- 🔒 **User Responsibility**: Users must respect copyright laws and terms of service of all third-party services

**By using this project, you agree to:**
- Use it solely for educational purposes
- Not use it to infringe on any copyrights
- Comply with all applicable laws and regulations
- Respect the terms of service of all third-party APIs and services used

This project does not promote or facilitate piracy in any way. It is a technical demonstration of frontend development capabilities.

## 🆘 Support

- 📖 [Documentation](GITHUB_SETUP.md)
- 🐛 [Report Issues](https://github.com/enyw/flux/issues)
- 💬 [Discussions](https://github.com/enyw/flux/discussions)

---

<div align="center">

**Made with ❤️ using React + TypeScript + Vite**

[⭐ Star this repo](https://github.com/Ennyw/flux) if you find it helpful!

**📖 Read the [Repository Setup Guide](REPOSITORY_SETUP.md) to make your fork look professional**

---

### 📈 Repository Stats

![GitHub repo size](https://img.shields.io/github/repo-size/Ennyw/flux)
![GitHub language count](https://img.shields.io/github/languages/count/Ennyw/flux)
![GitHub top language](https://img.shields.io/github/languages/top/Ennyw/flux)
![GitHub last commit](https://img.shields.io/github/last-commit/Ennyw/flux/main)

### 🌟 Show Your Support

Give a ⭐ if this project helped you!

</div>
