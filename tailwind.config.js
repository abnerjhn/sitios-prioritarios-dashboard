/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Custom earth/map colors if needed
            },
            boxShadow: {
                'earthquake': '0 -4px 20px -5px rgba(0, 0, 0, 0.3)',
            }
        },
    },
    plugins: [],
}
