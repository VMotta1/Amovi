/**
 * Comprehensive list of known subscription services with detection keywords and
 * typical monthly price ranges (in CAD). Used to auto-detect subscriptions from
 * Plaid and Supabase transaction histories.
 *
 * price ranges are [min, max] monthly in CAD.
 */

export interface KnownSubscription {
  name: string;
  emoji: string;
  category: string;
  /** Keywords to match against transaction name/merchant (case-insensitive) */
  keywords: string[];
  /** Typical monthly price range in CAD [min, max] */
  priceRange: [number, number];
}

export const KNOWN_SUBSCRIPTIONS: KnownSubscription[] = [
  // ── Streaming – Video ──────────────────────────────────────────────────────
  {
    name: "Netflix",
    emoji: "🎬",
    category: "Streaming",
    keywords: ["netflix"],
    priceRange: [5.99, 22.99],
  },
  {
    name: "Disney+",
    emoji: "🏰",
    category: "Streaming",
    keywords: ["disney+", "disneyplus", "disney plus"],
    priceRange: [7.99, 14.99],
  },
  {
    name: "Crave",
    emoji: "📺",
    category: "Streaming",
    keywords: ["crave", "cravetv"],
    priceRange: [9.99, 22.99],
  },
  {
    name: "Amazon Prime Video",
    emoji: "📦",
    category: "Streaming",
    keywords: ["amazon prime", "prime video", "amzn", "amazon.ca", "amazon video"],
    priceRange: [8.99, 9.99],
  },
  {
    name: "Apple TV+",
    emoji: "🍎",
    category: "Streaming",
    keywords: ["apple tv", "apple.com/bill"],
    priceRange: [8.99, 8.99],
  },
  {
    name: "YouTube Premium",
    emoji: "▶️",
    category: "Streaming",
    keywords: ["youtube premium", "google youtube"],
    priceRange: [13.99, 22.99],
  },
  {
    name: "Paramount+",
    emoji: "🌟",
    category: "Streaming",
    keywords: ["paramount+", "paramountplus", "paramount plus"],
    priceRange: [6.99, 11.99],
  },
  {
    name: "Hayu",
    emoji: "💅",
    category: "Streaming",
    keywords: ["hayu"],
    priceRange: [6.99, 6.99],
  },
  {
    name: "Tubi",
    emoji: "📡",
    category: "Streaming",
    keywords: ["tubi"],
    priceRange: [0, 0],
  },

  // ── Streaming – Music ──────────────────────────────────────────────────────
  {
    name: "Spotify",
    emoji: "🎵",
    category: "Music",
    keywords: ["spotify"],
    priceRange: [5.99, 16.99],
  },
  {
    name: "Apple Music",
    emoji: "🎶",
    category: "Music",
    keywords: ["apple music"],
    priceRange: [5.99, 17.99],
  },
  {
    name: "Tidal",
    emoji: "🎼",
    category: "Music",
    keywords: ["tidal"],
    priceRange: [10.99, 21.99],
  },
  {
    name: "Amazon Music",
    emoji: "🎸",
    category: "Music",
    keywords: ["amazon music"],
    priceRange: [9.99, 9.99],
  },
  {
    name: "Deezer",
    emoji: "🎹",
    category: "Music",
    keywords: ["deezer"],
    priceRange: [10.99, 14.99],
  },
  {
    name: "SiriusXM",
    emoji: "📻",
    category: "Music",
    keywords: ["siriusxm", "sirius xm"],
    priceRange: [9.99, 21.99],
  },

  // ── Software / Productivity ───────────────────────────────────────────────
  {
    name: "Microsoft 365",
    emoji: "💼",
    category: "Productivity",
    keywords: ["microsoft 365", "microsoft office", "office 365", "msft"],
    priceRange: [8.33, 16.99],
  },
  {
    name: "Adobe Creative Cloud",
    emoji: "🎨",
    category: "Creativity",
    keywords: ["adobe", "adobe systems", "adobe creative"],
    priceRange: [30.25, 95.99],
  },
  {
    name: "Notion",
    emoji: "📝",
    category: "Productivity",
    keywords: ["notion.so", "notion labs"],
    priceRange: [0, 20.00],
  },
  {
    name: "Figma",
    emoji: "🖼️",
    category: "Design",
    keywords: ["figma"],
    priceRange: [0, 20.00],
  },
  {
    name: "Canva",
    emoji: "🖌️",
    category: "Design",
    keywords: ["canva"],
    priceRange: [0, 19.99],
  },
  {
    name: "Grammarly",
    emoji: "✍️",
    category: "Productivity",
    keywords: ["grammarly"],
    priceRange: [14.99, 29.99],
  },
  {
    name: "Dropbox",
    emoji: "☁️",
    category: "Storage",
    keywords: ["dropbox"],
    priceRange: [13.99, 23.99],
  },
  {
    name: "Google One",
    emoji: "🗄️",
    category: "Storage",
    keywords: ["google one", "google storage", "google play"],
    priceRange: [2.79, 13.99],
  },
  {
    name: "iCloud+",
    emoji: "🍏",
    category: "Storage",
    keywords: ["icloud", "apple icloud"],
    priceRange: [1.29, 12.99],
  },
  {
    name: "1Password",
    emoji: "🔒",
    category: "Security",
    keywords: ["1password", "1passwd"],
    priceRange: [3.99, 7.99],
  },
  {
    name: "LastPass",
    emoji: "🛡️",
    category: "Security",
    keywords: ["lastpass"],
    priceRange: [4.50, 9.00],
  },
  {
    name: "NordVPN",
    emoji: "🔐",
    category: "Security",
    keywords: ["nordvpn", "nord vpn"],
    priceRange: [5.29, 11.99],
  },
  {
    name: "ExpressVPN",
    emoji: "🌐",
    category: "Security",
    keywords: ["expressvpn", "express vpn"],
    priceRange: [9.99, 12.95],
  },

  // ── Gaming ─────────────────────────────────────────────────────────────────
  {
    name: "Xbox Game Pass",
    emoji: "🎮",
    category: "Gaming",
    keywords: ["xbox game pass", "xbox gamepass", "microsoft xbox"],
    priceRange: [14.99, 19.99],
  },
  {
    name: "PlayStation Plus",
    emoji: "🕹️",
    category: "Gaming",
    keywords: ["playstation plus", "ps plus", "playstation network", "psn"],
    priceRange: [10.99, 17.99],
  },
  {
    name: "Nintendo Switch Online",
    emoji: "👾",
    category: "Gaming",
    keywords: ["nintendo switch online", "nintendo online"],
    priceRange: [3.99, 7.99],
  },
  {
    name: "EA Play",
    emoji: "⚽",
    category: "Gaming",
    keywords: ["ea play", "ea access", "electronic arts"],
    priceRange: [5.49, 16.49],
  },
  {
    name: "Ubisoft+",
    emoji: "🗡️",
    category: "Gaming",
    keywords: ["ubisoft", "uplay"],
    priceRange: [17.99, 17.99],
  },
  {
    name: "Twitch",
    emoji: "🟣",
    category: "Gaming",
    keywords: ["twitch"],
    priceRange: [6.99, 24.99],
  },

  // ── Food & Delivery ────────────────────────────────────────────────────────
  {
    name: "Uber Eats Pass",
    emoji: "🛵",
    category: "Food",
    keywords: ["uber eats pass", "ubereats pass", "uber one"],
    priceRange: [9.99, 14.99],
  },
  {
    name: "DoorDash DashPass",
    emoji: "🚗",
    category: "Food",
    keywords: ["dashpass", "doordash"],
    priceRange: [9.99, 9.99],
  },
  {
    name: "HelloFresh",
    emoji: "🥗",
    category: "Food",
    keywords: ["hellofresh", "hello fresh"],
    priceRange: [40, 120],
  },
  {
    name: "GoodFood",
    emoji: "🍽️",
    category: "Food",
    keywords: ["goodfood", "good food"],
    priceRange: [39, 99],
  },

  // ── Fitness & Health ───────────────────────────────────────────────────────
  {
    name: "Peloton",
    emoji: "🚴",
    category: "Fitness",
    keywords: ["peloton"],
    priceRange: [16.99, 59.99],
  },
  {
    name: "Headspace",
    emoji: "🧘",
    category: "Wellness",
    keywords: ["headspace"],
    priceRange: [12.99, 69.99],
  },
  {
    name: "Calm",
    emoji: "😌",
    category: "Wellness",
    keywords: ["calm.com", "calm app"],
    priceRange: [8.99, 8.99],
  },
  {
    name: "Noom",
    emoji: "⚖️",
    category: "Wellness",
    keywords: ["noom"],
    priceRange: [59, 70],
  },

  // ── Education ──────────────────────────────────────────────────────────────
  {
    name: "Duolingo Plus",
    emoji: "🦉",
    category: "Education",
    keywords: ["duolingo"],
    priceRange: [9.99, 13.99],
  },
  {
    name: "Coursera",
    emoji: "🎓",
    category: "Education",
    keywords: ["coursera"],
    priceRange: [59, 79],
  },
  {
    name: "LinkedIn Learning",
    emoji: "👔",
    category: "Education",
    keywords: ["linkedin learning", "linkedin premium"],
    priceRange: [39.99, 59.99],
  },
  {
    name: "Skillshare",
    emoji: "🖊️",
    category: "Education",
    keywords: ["skillshare"],
    priceRange: [14.99, 19.99],
  },
  {
    name: "MasterClass",
    emoji: "🏆",
    category: "Education",
    keywords: ["masterclass"],
    priceRange: [10.00, 20.00],
  },
  {
    name: "Udemy",
    emoji: "📖",
    category: "Education",
    keywords: ["udemy"],
    priceRange: [0, 19.99],
  },
  {
    name: "Khan Academy",
    emoji: "🧑‍🏫",
    category: "Education",
    keywords: ["khan academy"],
    priceRange: [0, 5.00],
  },
  {
    name: "Chegg",
    emoji: "📚",
    category: "Education",
    keywords: ["chegg"],
    priceRange: [14.95, 19.95],
  },

  // ── News & Reading ─────────────────────────────────────────────────────────
  {
    name: "New York Times",
    emoji: "📰",
    category: "News",
    keywords: ["new york times", "nytimes", "nyt"],
    priceRange: [4.25, 17.00],
  },
  {
    name: "The Globe and Mail",
    emoji: "🍁",
    category: "News",
    keywords: ["globe and mail", "globeandmail"],
    priceRange: [9.99, 24.99],
  },
  {
    name: "Toronto Star",
    emoji: "⭐",
    category: "News",
    keywords: ["toronto star", "thestar"],
    priceRange: [4.99, 12.99],
  },
  {
    name: "The Athletic",
    emoji: "🏒",
    category: "Sports",
    keywords: ["the athletic", "theathletic"],
    priceRange: [5.49, 12.49],
  },
  {
    name: "Medium",
    emoji: "✒️",
    category: "News",
    keywords: ["medium.com"],
    priceRange: [6.99, 9.99],
  },
  {
    name: "Substack",
    emoji: "📬",
    category: "News",
    keywords: ["substack"],
    priceRange: [5, 30],
  },
  {
    name: "Kindle Unlimited",
    emoji: "📕",
    category: "Reading",
    keywords: ["kindle unlimited"],
    priceRange: [9.99, 9.99],
  },
  {
    name: "Audible",
    emoji: "🎧",
    category: "Reading",
    keywords: ["audible"],
    priceRange: [14.95, 22.95],
  },

  // ── Utilities / Infrastructure ─────────────────────────────────────────────
  {
    name: "GitHub",
    emoji: "🐱",
    category: "Developer Tools",
    keywords: ["github"],
    priceRange: [0, 21.00],
  },
  {
    name: "Vercel",
    emoji: "▲",
    category: "Developer Tools",
    keywords: ["vercel"],
    priceRange: [0, 30.00],
  },
  {
    name: "Heroku",
    emoji: "💜",
    category: "Developer Tools",
    keywords: ["heroku", "salesforce heroku"],
    priceRange: [0, 25.00],
  },
  {
    name: "AWS",
    emoji: "🔶",
    category: "Developer Tools",
    keywords: ["amazon web services", "aws.amazon"],
    priceRange: [1, 100],
  },
  {
    name: "ChatGPT Plus",
    emoji: "🤖",
    category: "AI",
    keywords: ["openai", "chatgpt"],
    priceRange: [27.00, 27.00],
  },
  {
    name: "Claude Pro",
    emoji: "🧠",
    category: "AI",
    keywords: ["anthropic"],
    priceRange: [27.00, 27.00],
  },
  {
    name: "Copilot",
    emoji: "🤝",
    category: "AI",
    keywords: ["github copilot", "copilot"],
    priceRange: [13.00, 27.00],
  },
  {
    name: "Midjourney",
    emoji: "🖼️",
    category: "AI",
    keywords: ["midjourney"],
    priceRange: [12.00, 120.00],
  },

  // ── Canadian-Specific ──────────────────────────────────────────────────────
  {
    name: "Presto / TTC",
    emoji: "🚇",
    category: "Transport",
    keywords: ["presto", "ttc presto", "presto monthly"],
    priceRange: [143, 153],
  },
  {
    name: "Cineplex",
    emoji: "🎥",
    category: "Entertainment",
    keywords: ["cineplex", "cineplex odeon"],
    priceRange: [9.99, 9.99],
  },
  {
    name: "CBC Gem",
    emoji: "🍁",
    category: "Streaming",
    keywords: ["cbc gem", "cbcgem"],
    priceRange: [0, 4.99],
  },
  {
    name: "TSN Direct",
    emoji: "🏈",
    category: "Sports",
    keywords: ["tsn direct", "tsn.ca"],
    priceRange: [4.99, 19.99],
  },
  {
    name: "Sportsnet Now",
    emoji: "⚾",
    category: "Sports",
    keywords: ["sportsnet now", "sportsnet"],
    priceRange: [9.99, 34.99],
  },
];

/**
 * Given a transaction name/description, return the matching KnownSubscription
 * if any keyword matches.
 */
export function matchKnownSubscription(merchantName: string): KnownSubscription | null {
  const lower = merchantName.toLowerCase();
  for (const sub of KNOWN_SUBSCRIPTIONS) {
    if (sub.keywords.some((kw) => lower.includes(kw))) {
      return sub;
    }
  }
  return null;
}

/**
 * Returns true if the transaction amount falls within (or close to) the known
 * subscription's price range (with a small tolerance for tax/FX).
 */
export function isAmountInPriceRange(amount: number, sub: KnownSubscription): boolean {
  const [min, max] = sub.priceRange;
  // Allow 20% tolerance above max to account for tax or currency conversion
  return amount >= min * 0.5 && amount <= max * 1.25;
}
