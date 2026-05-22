#!/usr/bin/env bash
# Fieldbase Crew — iOS setup
# ====================================================
# Робить три речі:
#   1. Перевіряє чи є XcodeGen, ставить через brew якщо ні
#   2. Створює Secrets.xcconfig якщо його ще немає
#   3. Генерує FieldbaseCrew.xcodeproj
#   4. Відкриває проект в Xcode
# ====================================================

set -e

# Колірний вивід
B="\033[1m"; R="\033[0m"; G="\033[32m"; Y="\033[33m"; ERR="\033[31m"

cd "$(dirname "$0")"

echo -e "${B}🛠  Fieldbase Crew — iOS setup${R}\n"

# 1. Mac?
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo -e "${ERR}❌ Цей скрипт треба запускати на Mac (потрібен Xcode).${R}"
  exit 1
fi

# 2. Xcode?
if ! xcode-select -p &> /dev/null; then
  echo -e "${ERR}❌ Xcode не встановлено. Встанови з App Store і запусти знову.${R}"
  exit 1
fi
echo -e "${G}✓${R} Xcode знайдено: $(xcode-select -p)"

# 3. Homebrew?
if ! command -v brew &> /dev/null; then
  echo -e "${Y}⚠ Homebrew не встановлено. Встановлюю...${R}"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
echo -e "${G}✓${R} Homebrew готовий"

# 4. XcodeGen?
if ! command -v xcodegen &> /dev/null; then
  echo -e "${Y}⚠ XcodeGen не встановлено. Ставлю...${R}"
  brew install xcodegen
fi
echo -e "${G}✓${R} XcodeGen готовий: $(xcodegen --version)"

# 5. Secrets.xcconfig?
if [ ! -f "Secrets.xcconfig" ]; then
  echo -e "\n${Y}⚠ Secrets.xcconfig відсутній.${R}"
  echo "   Створюю з прикладу — підстав свої Supabase ключі!"
  cp Secrets.xcconfig.example Secrets.xcconfig
  echo -e "${ERR}   !!! Відкрий Secrets.xcconfig і встав свої SUPABASE_URL і SUPABASE_ANON_KEY перш ніж запускати!${R}"
else
  echo -e "${G}✓${R} Secrets.xcconfig існує"
fi

# 6. Resources/Info.plist треба існувати щоб XcodeGen не падав
mkdir -p Resources

# 7. Створюємо Assets.xcassets зі стандартними AppIcon і AccentColor якщо немає
if [ ! -d "Resources/Assets.xcassets" ]; then
  mkdir -p Resources/Assets.xcassets/AppIcon.appiconset
  mkdir -p Resources/Assets.xcassets/AccentColor.colorset

  cat > Resources/Assets.xcassets/Contents.json <<'EOF'
{ "info" : { "author" : "xcode", "version" : 1 } }
EOF
  cat > Resources/Assets.xcassets/AppIcon.appiconset/Contents.json <<'EOF'
{
  "images" : [
    { "idiom" : "universal", "platform" : "ios", "size" : "1024x1024" }
  ],
  "info" : { "author" : "xcode", "version" : 1 }
}
EOF
  cat > Resources/Assets.xcassets/AccentColor.colorset/Contents.json <<'EOF'
{
  "colors" : [
    {
      "color" : {
        "color-space" : "srgb",
        "components" : {
          "alpha" : "1.000",
          "blue" : "0.235",
          "green" : "0.659",
          "red" : "0.957"
        }
      },
      "idiom" : "universal"
    }
  ],
  "info" : { "author" : "xcode", "version" : 1 }
}
EOF
  echo -e "${G}✓${R} Assets.xcassets створено"
fi

# 8. Генеруємо .xcodeproj
echo -e "\n${B}🔧 Генерую FieldbaseCrew.xcodeproj...${R}"
xcodegen generate

# 9. Відкриваємо
echo -e "\n${G}✅ Готово!${R}"
echo "   FieldbaseCrew.xcodeproj створено."
echo
echo "Наступні кроки в Xcode:"
echo "  1. Натисни ▶ зверху щоб запустити в симуляторі"
echo "  2. Або в Signing & Capabilities встав свій Apple ID і запусти на iPhone"
echo
echo "Відкриваю Xcode..."
open FieldbaseCrew.xcodeproj
