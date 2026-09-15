import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Отключаем линтинг для собранных бандлов и служебных файлов Next.js
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    // Отключаем строгие блокировки сборщика из-за мелких недочетов TypeScript и React
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Разрешаем тип any в блоках catch для работы с Neon БД
      "@typescript-eslint/no-unused-vars": "warn", // Превращаем неиспользуемые переменные в обычные варнинги
      "react/no-unescaped-entities": "off", // Разрешаем кавычки и спецсимволы в JSX текстах калькулятора
      "@next/next/no-img-element": "off", // Разрешаем тег <img> для локальных crypto-icons картинок монеты
      "no-inner-declarations": "off", // Отключаем строгую проверку вложенных функций
    },
  },
]);

export default eslintConfig;
