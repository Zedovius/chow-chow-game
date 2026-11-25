// El trago de cada signo, de la carta de Chow Chow House (las fotos de assets/images/info-logo-tragos, que no se
// publican). Sale en la tarjeta del signo (ui/ZodiacWheel.js) y al final: solo, en grande (ui/drinkScreen.js), y
// junto al nombre en HI RECORDS (ui/drink.js).
//
//   name     como está en la carta (no se traduce). Qué lleva: drinks.<signo>, en js/i18n/
//   taste    sus tres cualidades: [cuál (taste.<id> en js/i18n/), cuánto (de 0 a 1, 0.5 la raya de en medio)]
//
// Su vaso girando, assets/images/tragos/<signo>.png, lo hace tools/sprites/tragos.mjs (npm run tragos).

export const COCKTAILS_BY_SIGN = {
  rat: { name: 'Mushroom Manhattan', taste: [['umami', 0.9], ['fungal', 1], ['fruity', 0.6]] },
  ox: { name: 'Lichie Martini', taste: [['earthy', 0.38], ['dry', 0.38], ['fruity', 0.81]] },
  tiger: { name: 'Candy Wine', taste: [['floral', 0.65], ['fizzy', 0.75], ['sweet', 0.75]] },
  rabbit: { name: 'Rosé Spritz', taste: [['floral', 0.93], ['bubbly', 0.78], ['smoky', 0.5]] },
  dragon: { name: 'Espresso Martinez', taste: [['vinous', 0.9], ['bitter', 0.19], ['silky', 0.6]] },
  snake: { name: 'Purple Collins', taste: [['experimental', 0.91], ['nutty', 0.58], ['spiced', 0.2]] },
  horse: { name: 'Strawberry & Whisky', taste: [['sweet', 0.63], ['bitter', 0.63], ['smoky', 0.5]] },
  goat: { name: 'Pox Piña Colada', taste: [['vinous', 1], ['sweet', 0.08], ['aromatic', 0.67]] },
  monkey: { name: 'Spicy Margarita', taste: [['hot', 0.38], ['refreshing', 0.9], ['citrus', 0.9]] },
  rooster: { name: 'Pizza Highball', taste: [['hot', 0.57], ['experimental', 0.92], ['salty', 0.5]] },
  dog: { name: 'Kaffir & Olives', taste: [['herbal', 0.9], ['floral', 0.58], ['saline', 0.13]] },
  pig: { name: 'Mangostán Fizz', taste: [['umami', 0.5], ['exotic', 0.84], ['sparkling', 0.84]] },
};

/** El trago de un signo ('rat', 'ox'...), o null si no tiene. */
export const cocktailOf = (sign) => COCKTAILS_BY_SIGN[sign] ?? null;
