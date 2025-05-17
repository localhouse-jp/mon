/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'Roboto Mono'", 'monospace'],
      },

      colors: {
        bg: '#0E1116',         // ページ背景
        card: '#161B22',       // カード背景
        'card-dark': '#1A2230',// 見出し帯
        'text-primary': '#E6EDF3', // 主要文字
        'text-secondary': '#9FA9B8',// 補助文字
        'accent-time': '#58A6FF',    // 発車時刻
        'badge-bg': '#F2CC60',       // バッジ背景
        'badge-text': '#1E1E1E',     // バッジ文字
        'accent-line': '#2188FF',    // 左側ライン
      },
    },
  },
  plugins: [],
}

