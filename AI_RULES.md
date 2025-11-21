# AI Rules for "Gestione Magazzino Cartoni" Application

This document outlines the core technologies and specific library usage guidelines for developing and maintaining this application. Adhering to these rules ensures consistency, maintainability, and leverages the strengths of the chosen tech stack.

## Tech Stack Overview

This application is built using a modern React ecosystem, focusing on performance, developer experience, and a robust UI.

*   **React & TypeScript**: The core frontend framework, providing a component-based architecture with strong typing for improved code quality.
*   **Vite**: A fast build tool that offers quick development server startup and hot module replacement.
*   **Tailwind CSS**: A utility-first CSS framework for rapidly building custom designs directly in your markup.
*   **shadcn/ui**: A collection of re-usable components built with Radix UI and Tailwind CSS, providing accessible and customizable UI elements.
*   **React Router DOM**: For declarative routing within the application, managing navigation between different views.
*   **Supabase**: Used as the backend-as-a-service for database management, authentication, and real-time data synchronization.
*   **React Query**: For efficient server-state management, including data fetching, caching, synchronization, and updates.
*   **React Hook Form & Zod**: For robust form handling and schema-based validation, ensuring data integrity.
*   **Sonner**: A modern toast library for displaying non-blocking notifications to the user.
*   **Lucide React**: A library of beautiful and customizable open-source icons.
*   **jspdf & xlsx**: Libraries for exporting table data into PDF and Excel formats, respectively.

## Library Usage Rules

To maintain consistency and leverage the strengths of our chosen libraries, please follow these guidelines:

*   **UI Components**:
    *   Always prioritize `shadcn/ui` components for building the user interface.
    *   If a required component is not available in `shadcn/ui` or needs significant customization, create a new component in `src/components/` and style it using Tailwind CSS. **Do not modify `shadcn/ui` source files directly.**
*   **Styling**:
    *   All styling must be done using **Tailwind CSS** utility classes. Avoid writing custom CSS in `.css` files unless absolutely necessary for global styles (e.g., in `index.css`).
*   **Routing**:
    *   Use `react-router-dom` for all client-side navigation.
    *   All main application routes should be defined within `src/App.tsx`.
    *   Use the `NavLink` component from `src/components/NavLink.tsx` for navigation links to ensure proper active state styling.
*   **State Management**:
    *   For server-side data fetching, caching, and synchronization, use **React Query**.
    *   For local component state, use React's built-in `useState` and `useReducer` hooks.
*   **Forms & Validation**:
    *   Implement all forms using **React Hook Form**.
    *   Perform form validation using **Zod** schemas.
*   **Icons**:
    *   Use icons from the **`lucide-react`** library.
*   **Notifications**:
    *   Use **`sonner`** for all toast notifications to provide user feedback.
*   **Database Interaction**:
    *   All interactions with the Supabase backend (database queries, authentication, real-time subscriptions) must use the **`@supabase/supabase-js`** client, initialized in `src/lib/supabase.ts`.
*   **Date Handling**:
    *   Use `date-fns` for any date manipulation, formatting, or parsing.
    *   Custom formatters are available in `src/utils/formatters.ts`.
*   **File Export**:
    *   For exporting data to PDF, use `jspdf` and `jspdf-autotable`.
    *   For exporting data to Excel (XLSX), use `xlsx`. Utility functions for these are available in `src/utils/export.ts`.
*   **Authentication**:
    *   User authentication logic is handled via Supabase and exposed through the `useAuth` hook in `src/hooks/useAuth.ts`.
    *   Password hashing (for login verification) uses `bcryptjs` as implemented in `useAuth.ts`.
*   **Utility Functions**:
    *   General utility functions (e.g., `cn` for Tailwind class merging, formatters) should be placed in `src/lib/utils.ts` or `src/utils/`.