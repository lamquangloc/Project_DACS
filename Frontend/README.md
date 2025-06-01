# Restaurant Management System - Frontend

This is the frontend application for the Restaurant Management System, built with React, TypeScript, and Tailwind CSS.

## Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following content:
```
VITE_API_URL=http://localhost:8000
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Features

- User authentication (login/register)
- Product browsing and search
- Shopping cart
- Order management
- Admin dashboard
- Responsive design

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Redux Toolkit
- React Router
- Axios

## Project Structure

```
restaurant-frontend/
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # Reusable components
│   ├── data/            # Sample data
│   └── store/           # State management
├── public/              # Static assets
└── ...config files
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 