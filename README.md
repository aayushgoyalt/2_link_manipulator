# Electron Calculator

A modern, production-grade calculator application built with Electron, Vue 3, TypeScript, and Tailwind CSS v4.

![Calculator Preview](https://img.shields.io/badge/Electron-Calculator-blue)
![Vue 3](https://img.shields.io/badge/Vue-3-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-cyan)

## Features

### 5 Core Operations
- ➕ **Addition** - Add two numbers
- ➖ **Subtraction** - Subtract two numbers
- ✖️ **Multiplication** - Multiply two numbers
- ➗ **Division** - Divide two numbers (with zero-division protection)
- ➗ **Modulo** - Calculate remainder of division

### Additional Features
- 🔢 Decimal number support
- ➕➖ Toggle positive/negative numbers
- ⌫ Backspace to delete last digit
- 🧹 Clear all functionality
- 📊 Previous operation display
- 🎨 Modern, responsive UI with Tailwind CSS
- ⚡ Fast and lightweight Electron app

## Project Structure

```
electron-app/
├── src/
│   ├── main/                      # Electron main process
│   │   └── index.ts
│   ├── preload/                   # Electron preload scripts
│   │   └── index.ts
│   └── renderer/                  # Vue frontend
│       └── src/
│           ├── components/        # Reusable Vue components
│           │   ├── Calculator.vue          # Main calculator logic
│           │   ├── CalculatorButton.vue    # Reusable button component
│           │   └── CalculatorDisplay.vue   # Display component
│           ├── types/             # TypeScript type definitions
│           │   └── calculator.ts
│           ├── utils/             # Utility functions
│           │   └── calculatorLogic.ts      # Pure calculation functions
│           ├── App.vue            # Root component
│           ├── main.ts            # Vue app entry point
│           └── style.css          # Global styles
├── electron.vite.config.ts        # Electron Vite configuration
├── tailwind.config.cjs            # Tailwind CSS configuration
├── postcss.config.cjs             # PostCSS configuration
├── package.json                   # Dependencies and scripts
└── README.md                      # This file
```

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager

## Installation

1. **Clone the repository** (or navigate to the project directory)
   ```bash
   cd electron-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

## Development

### Run in Development Mode

Start the application with hot-reload for development:

```bash
npm run dev
```

This will:
- Start the Electron app
- Enable hot-reload for Vue components
- Open DevTools automatically

### Type Checking

Run TypeScript type checking:

```bash
npm run typecheck
```

Or check specific parts:
```bash
npm run typecheck:node    # Check main/preload processes
npm run typecheck:web     # Check renderer process
```

### Linting

Check and fix code style issues:

```bash
npm run lint
```

### Format Code

Format code with Prettier:

```bash
npm run format
```

## Building for Production

### Build the Application

Create a production build:

```bash
npm run build
```

### Package the Application

Build and package for your platform:

```bash
# Build without packaging (for testing)
npm run build:unpack

# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux
```

The packaged application will be in the `dist` directory.

## Usage Guide

### Basic Operations

1. **Enter Numbers**: Click number buttons (0-9) to input values
2. **Decimal Numbers**: Click the `.` button to add decimal points
3. **Perform Operations**: 
   - Click `+` for addition
   - Click `−` for subtraction
   - Click `×` for multiplication
   - Click `÷` for division
   - Click `%` for modulo (remainder)
4. **Get Result**: Click `=` to calculate the result
5. **Clear**: Click `C` to reset the calculator

### Advanced Features

- **Backspace**: Click `⌫` to delete the last digit
- **Toggle Sign**: Click `±` to switch between positive and negative
- **Chain Operations**: Perform multiple operations in sequence
- **Error Handling**: Division by zero shows "Error"

### Example Calculations

```
Addition:       5 + 3 = 8
Subtraction:    10 − 4 = 6
Multiplication: 7 × 6 = 42
Division:       20 ÷ 4 = 5
Modulo:         17 % 5 = 2
Chained:        5 + 3 × 2 = 16 (calculates left to right)
```

## Architecture

### Component Design

The application follows a modular, component-based architecture:

- **Calculator.vue**: Main component managing state and business logic
- **CalculatorDisplay.vue**: Presentational component for showing values
- **CalculatorButton.vue**: Reusable button with variant styling

### State Management

Calculator state is managed using Vue 3's Composition API with reactive refs:

```typescript
interface CalculatorState {
  currentValue: string;      // Currently displayed value
  previousValue: string;     // Previous value for operations
  operation: Operation | null; // Current operation (+, -, *, /, %)
  shouldResetDisplay: boolean; // Flag to reset display on next input
}
```

### Utility Functions

Pure functions in `calculatorLogic.ts` handle:
- Arithmetic calculations
- Number formatting
- Input validation

This separation ensures testability and maintainability.

## Technology Stack

- **Electron** v28 - Cross-platform desktop framework
- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS v4** - Utility-first CSS framework
- **Vite** - Fast build tool and dev server
- **electron-vite** - Electron-specific Vite integration

## Configuration Files

- `electron.vite.config.ts` - Electron and Vite build configuration
- `tailwind.config.cjs` - Tailwind CSS content paths
- `postcss.config.cjs` - PostCSS plugins (Tailwind v4)
- `tsconfig.json` - TypeScript compiler options
- `package.json` - Project metadata and scripts

## Troubleshooting

### Application won't start
- Ensure all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be v18+)
- Clear cache: `rm -rf node_modules && npm install`

### Tailwind styles not working
- Verify `style.css` is imported in `main.ts`
- Check that Tailwind plugin is in `electron.vite.config.ts`
- Restart dev server: `npm run dev`

### Build errors
- Run type checking: `npm run typecheck`
- Check for linting errors: `npm run lint`
- Ensure all imports are correct

## Contributing

When contributing to this project:

1. Follow the existing code structure
2. Add comments for complex logic
3. Use TypeScript types consistently
4. Test all calculator operations
5. Run linting and type checking before committing

## License

This project is licensed under the MIT License.

## Author

Created with ❤️ using Electron, Vue 3, and Tailwind CSS

---

**Need Help?** Check the [Electron documentation](https://www.electronjs.org/docs) or [Vue 3 documentation](https://vuejs.org/)
