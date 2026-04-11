// Mock data for the demand forecasting platform

export const generateDemandData = (days: number = 30) => {
  const data = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - days);
  
  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseDemand = 1000 + Math.random() * 500;
    const seasonality = Math.sin(i / 7 * Math.PI) * 200;
    const actual = Math.round(baseDemand + seasonality + (isWeekend ? -200 : 0) + Math.random() * 100);
    
    data.push({
      date: date.toISOString().split('T')[0],
      actual: i < days - 7 ? actual : null,
      forecast: Math.round(actual * (0.95 + Math.random() * 0.1)),
      lower: Math.round(actual * 0.85),
      upper: Math.round(actual * 1.15),
    });
  }
  return data;
};

export const products = [
  { id: 1, name: 'Premium Headphones', sku: 'PH-001', category: 'Electronics' },
  { id: 2, name: 'Wireless Mouse', sku: 'WM-002', category: 'Electronics' },
  { id: 3, name: 'USB-C Hub', sku: 'UC-003', category: 'Accessories' },
  { id: 4, name: 'Mechanical Keyboard', sku: 'MK-004', category: 'Electronics' },
  { id: 5, name: 'Monitor Stand', sku: 'MS-005', category: 'Accessories' },
];

export const stores = [
  { id: 1, name: 'New York Store', region: 'Northeast' },
  { id: 2, name: 'Los Angeles Store', region: 'West' },
  { id: 3, name: 'Chicago Store', region: 'Midwest' },
  { id: 4, name: 'Miami Store', region: 'Southeast' },
  { id: 5, name: 'Seattle Store', region: 'Northwest' },
];

export const kpiData = {
  totalDemand: 45230,
  inventoryCost: 128500,
  stockoutRisk: 12,
  overstockRisk: 8,
  revenue: 892000,
  accuracy: 94.5,
};

export const alerts = [
  {
    id: 1,
    type: 'warning',
    title: 'Low Stock Alert',
    message: 'Premium Headphones inventory below safety stock at NYC Store',
    time: '5 min ago',
    product: 'Premium Headphones',
  },
  {
    id: 2,
    type: 'error',
    title: 'Stock-out Risk',
    message: 'Wireless Mouse expected to run out in 3 days',
    time: '12 min ago',
    product: 'Wireless Mouse',
  },
  {
    id: 3,
    type: 'info',
    title: 'Demand Spike Detected',
    message: 'Unusual 40% increase in USB-C Hub demand',
    time: '1 hour ago',
    product: 'USB-C Hub',
  },
  {
    id: 4,
    type: 'success',
    title: 'Optimization Applied',
    message: 'Inventory levels optimized for Mechanical Keyboard',
    time: '2 hours ago',
    product: 'Mechanical Keyboard',
  },
];

export const heatmapData = products.flatMap(product =>
  stores.map(store => ({
    product: product.name,
    store: store.name,
    demand: Math.round(50 + Math.random() * 150),
  }))
);

export const inventoryRecommendations = [
  {
    product: 'Premium Headphones',
    currentStock: 145,
    reorderPoint: 120,
    reorderQty: 200,
    safetyStock: 50,
    leadTime: 7,
    costSavings: 4500,
    riskLevel: 'medium',
  },
  {
    product: 'Wireless Mouse',
    currentStock: 89,
    reorderPoint: 100,
    reorderQty: 300,
    safetyStock: 40,
    leadTime: 5,
    costSavings: 3200,
    riskLevel: 'high',
  },
  {
    product: 'USB-C Hub',
    currentStock: 234,
    reorderPoint: 80,
    reorderQty: 150,
    safetyStock: 30,
    leadTime: 4,
    costSavings: 1800,
    riskLevel: 'low',
  },
];

export const chatResponses: Record<string, string> = {
  'why did demand increase': 
    "Based on our AI analysis, the demand increase is attributed to three key factors:\n\n1. **Seasonal Pattern**: We're entering a high-demand period historically associated with increased consumer spending.\n\n2. **Promotional Impact**: Recent marketing campaigns have driven a 23% increase in product visibility.\n\n3. **Market Trends**: Competitor stock-outs have redirected approximately 15% of market demand to our products.",
  
  'which product has highest risk':
    "**Wireless Mouse (WM-002)** currently has the highest risk profile:\n\n• Stock-out probability: 78% within 5 days\n• Current inventory: 89 units (below safety stock)\n• Demand velocity: +34% above forecast\n\n**Recommended Action**: Expedite reorder of 300 units immediately.",
  
  'explain inventory recommendation':
    "Our AI-driven inventory recommendations are calculated using:\n\n1. **Demand Forecast**: ML model predicting next 30 days\n2. **Lead Time Analysis**: Supplier delivery patterns\n3. **Safety Stock**: Buffer for demand variability\n4. **Cost Optimization**: Balancing holding vs. ordering costs\n\nThe system continuously learns from actual demand patterns to improve accuracy.",
  
  'how does this system work':
    "This AI platform operates in four stages:\n\n1. **Data Collection**: Real-time sales, inventory, and market data ingestion\n\n2. **AI Forecasting**: Deep learning models predict demand with 94.5% accuracy\n\n3. **Optimization Engine**: Mathematical optimization for inventory decisions\n\n4. **Explainable AI**: Natural language insights explaining every recommendation\n\nAll models are continuously retrained to adapt to changing patterns.",
  
  'default':
    "I'm your AI assistant for demand forecasting and inventory optimization. I can help you understand:\n\n• Demand patterns and forecasts\n• Inventory recommendations\n• Risk assessments\n• System capabilities\n\nWhat would you like to know more about?",
};

export const mlopsMetrics = {
  modelAccuracy: [
    { date: 'Week 1', accuracy: 91.2, mae: 45 },
    { date: 'Week 2', accuracy: 92.1, mae: 42 },
    { date: 'Week 3', accuracy: 93.4, mae: 38 },
    { date: 'Week 4', accuracy: 94.5, mae: 35 },
  ],
  dataDrift: [
    { feature: 'Price', drift: 0.02, status: 'healthy' },
    { feature: 'Seasonality', drift: 0.08, status: 'healthy' },
    { feature: 'Promotions', drift: 0.15, status: 'warning' },
    { feature: 'Competitor', drift: 0.05, status: 'healthy' },
  ],
  retrainingHistory: [
    { date: '2024-01-15', trigger: 'Scheduled', status: 'completed', improvement: '+1.2%' },
    { date: '2024-01-08', trigger: 'Drift Detected', status: 'completed', improvement: '+0.8%' },
    { date: '2024-01-01', trigger: 'Scheduled', status: 'completed', improvement: '+0.5%' },
  ],
};
