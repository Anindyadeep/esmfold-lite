# ESMFold Lite Frontend

A lightweight and modern frontend interface for ESMFold protein structure prediction. This application provides an intuitive UI for visualizing protein structures predicted by the ESMFold model.

## Features

- Clean, responsive UI built with React, Vite, and Material UI
- 3D protein structure visualization using Three.js and NGL Viewer
- Custom server configuration options
- Job management system to track predictions
- Supabase integration for data persistence (optional)

## Technology Stack

- React 18 with TypeScript
- Vite for fast development and building
- Material UI and Tailwind CSS for styling
- Three.js and NGL for 3D visualization
- Supabase for backend storage (optional)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/esmfold-lite-frontend.git
cd esmfold-lite-frontend
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory and add your Supabase credentials (optional)

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server

```bash
npm run dev
# or
yarn dev
```

## Build for Production

```bash
npm run build
# or
yarn build
```

## Security Considerations

- The frontend implements Content Security Policies to prevent XSS attacks
- Custom API URLs are validated before use
- All API requests use proper error handling and timeouts

## Backend Integration

This frontend is designed to work with the ESMFold Lite backend API. By default, it connects to a demo server, but you can configure your own server URL in the settings.

## License

MIT

Made with �� with Lovable.dev
