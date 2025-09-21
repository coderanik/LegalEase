# Legalify - AI Legal Assistant

A modern, professional legal AI assistant application built with Next.js 15, TypeScript, and Tailwind CSS v4.

## 🚀 Features

- **Landing Page** - Professional marketing page with hero section
- **Authentication** - Clean sign in/sign up forms
- **Dashboard** - Complete dashboard with sidebar navigation
- **AI Assistant** - Chat interface for legal queries
- **Document Management** - Upload and analyze legal documents
- **Client Management** - Manage client relationships
- **Analytics** - Performance metrics and insights
- **Settings** - Account configuration and preferences

## 🛠️ Tech Stack

- **Framework**: Next.js 15.5.3 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom components with shadcn/ui
- **Icons**: Lucide React
- **Build Tool**: Turbopack
- **Package Manager**: npm

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0 or higher)
- **npm** (v8.0 or higher)
- **Git**

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd legal-ai-frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Add your environment variables here
# For example:
# NEXTAUTH_SECRET=your-secret-key
# NEXTAUTH_URL=http://localhost:3000
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── signin/            # Authentication pages
│   ├── signup/
│   ├── dashboard/         # Dashboard pages
│   │   ├── layout.tsx     # Dashboard layout with sidebar
│   │   ├── page.tsx       # Main dashboard
│   │   ├── assistant/     # AI Assistant page
│   │   ├── documents/     # Document management
│   │   ├── clients/       # Client management
│   │   ├── analytics/     # Analytics dashboard
│   │   └── settings/      # Settings page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   └── ui/               # UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       └── switch.tsx
└── lib/                  # Utility functions
    └── utils.ts
```

## 🎨 Styling

This project uses **Tailwind CSS v4** with the modern import syntax:

```css
@import "tailwindcss";
```

### Key Features:
- **Responsive Design** - Mobile-first approach
- **Modern UI** - Clean, professional interface
- **Custom Components** - Reusable UI components
- **Dark/Light Mode Ready** - Built with CSS variables

## 🚀 Available Scripts

```bash
# Development
npm run dev          # Start development server with Turbopack

# Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
```

## 📱 Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with hero section |
| `/signin` | Sign in page |
| `/signup` | Sign up page |
| `/dashboard` | Main dashboard |
| `/dashboard/assistant` | AI Assistant chat |
| `/dashboard/documents` | Document management |
| `/dashboard/clients` | Client management |
| `/dashboard/analytics` | Analytics dashboard |
| `/dashboard/settings` | Settings page |

## 🎯 Development Guidelines

### Code Style
- Use TypeScript for all components
- Follow Next.js App Router conventions
- Use Tailwind CSS for styling
- Keep components small and focused

### Component Structure
```tsx
// Example component structure
import { ComponentProps } from 'react';

interface ComponentProps {
  // Define props here
}

export default function Component({ ...props }: ComponentProps) {
  return (
    <div>
      {/* Component content */}
    </div>
  );
}
```

### Styling Guidelines
- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Use semantic HTML elements
- Maintain consistent spacing and typography

## 🔧 Customization

### Adding New Pages
1. Create a new folder in `src/app/`
2. Add a `page.tsx` file
3. Export a default React component

### Adding New Components
1. Create component in `src/components/`
2. Use TypeScript interfaces for props
3. Follow the existing component patterns

### Styling
- Modify `src/app/globals.css` for global styles
- Use Tailwind CSS classes for component styling
- Add custom CSS variables if needed

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Deploy to Other Platforms
The application can be deployed to any platform that supports Next.js:
- **Vercel** (Recommended)
- **Netlify**
- **AWS Amplify**
- **Railway**
- **DigitalOcean App Platform**

## 🐛 Troubleshooting

### Common Issues

**Build Errors**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

**Dependency Issues**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Tailwind CSS Issues**
```bash
# Ensure Tailwind CSS v4 is properly configured
# Check that globals.css contains: @import "tailwindcss";
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Lucide React Icons](https://lucide.dev)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, email support@legalify.com or create an issue in the repository.

---

**Built with ❤️ using Next.js, TypeScript, and Tailwind CSS**
