"# Code Review Bot 🤖

An intelligent code review application that provides automated code analysis, suggestions, and team collaboration features using AI-powered insights.

## Features ✨

- 🔍 **AI-Powered Code Analysis**: Get intelligent suggestions and improvements for your code
- 👥 **Team Collaboration**: Create teams, manage members, and share feedback
- 🔗 **GitHub Integration**: Connect with GitHub repositories for seamless workflow
- 📊 **Analytics Dashboard**: Track team performance and code quality metrics
- 🔐 **Secure Authentication**: User management with Supabase authentication
- 🌐 **Multi-Language Support**: Support for JavaScript, Python, Java, C++, and more

## Tech Stack 🛠️

### Frontend
- React 18+ with Hooks
- Vite for fast development and building
- Tailwind CSS for styling
- React Router for navigation
- CodeMirror for code editing
- Recharts for data visualization

### Backend
- Node.js with Express.js
- Supabase for authentication and database
- Google Gemini AI for code analysis
- GitHub OAuth integration
- Multer for file uploads

## Quick Start 🚀

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- GitHub OAuth App
- Google Gemini API key

### Environment Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-username/code-review-bot.git
cd code-review-bot
```

2. **Client Environment Variables**
Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000
```

3. **Server Environment Variables**
Create `server/.env`:
```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GEMINI_API_KEY=your_gemini_api_key
```

### Installation & Development

1. **Install dependencies**
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

2. **Start development servers**
```bash
# Start backend server (in server directory)
npm run dev

# Start frontend server (in client directory)
npm run dev
```

3. **Open your browser**
Navigate to `http://localhost:5173` to see the application.

## Deployment 🚀

For production deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Quick Production Build
```bash
# Build client
cd client
npm run build

# Start server
cd ../server
npm start
```

## Contributing 🤝

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License 📄

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Support 💬

If you have any questions or need help, please open an issue or contact the team.

---

Made with ❤️ by [Khaleel](https://github.com/your-username)" 
