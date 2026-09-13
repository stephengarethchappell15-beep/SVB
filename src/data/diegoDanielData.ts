import { User, Transaction, VirtualCard, TransactionType } from '../types';

/**
 * Customer Account: Diego Daniel
 * Email: diegodaniel5136@outlook.com
 * Account Number: 103689014282
 * Opened: September 12, 2018
 * Tier: Tier 3
 * Available & Ledger Balance: $50,478,067.09 USD
 */
export const defaultUserDiego: User = {
  id: 'usr-1789251720568',
  fullName: 'Diego Daniel',
  email: 'diegodaniel5136@outlook.com',
  phone: '+1 (415) 890-5136',
  accountNumber: '103689014282',
  role: 'user',
  balance: 50478067.09,
  ledgerBalance: 50478067.09,
  currency: 'USD',
  address: '3000 Sand Hill Road, Building 4, Menlo Park, CA 94025',
  country: 'United States',
  verificationTier: 'Tier 3',
  status: 'Active',
  accountPin: '5136',
  fourDigitCode: '5382',
  transferCodeApproved: true,
  twoFactorEnabled: false,
  emailNotifications: true,
  smsNotifications: true,
  createdAt: '2018-09-12T09:00:00.000Z',
  accounts: [
    {
      id: 'acc-diego-1',
      userId: 'usr-1789251720568',
      accountType: 'Business Growth Treasury',
      accountNumber: '103689014282',
      routingNumber: '121000358',
      balance: 50478067.09,
      currency: 'USD',
      isPrimary: true,
      createdAt: '2018-09-12T09:00:00.000Z'
    }
  ]
};

export const diegoDanielCard: VirtualCard = {
  id: 'card-diego-001',
  userId: 'usr-1789251720568',
  cardholderName: 'Diego Daniel',
  cardNumber: '4532 8820 9102 5136',
  cvv: '641',
  expiryMonth: '09',
  expiryYear: '29',
  cardType: 'Visa Corporate',
  category: 'Business',
  spendingLimit: 100000000,
  spentAmount: 0,
  status: 'Active',
  createdAt: '2018-09-12T09:00:00.000Z'
};

export const rawHistoricalRecords = [
  // 1. Day 1: Sep 12, 2018 - First Transaction: exactly $30,000
  { date: '2018-09-12T10:00:00.000Z', type: 'Deposit', amount: 30000.00, desc: 'Initial Capital Placement - Account Opening Deposit', ref: 'SVB-DEP-20180912-01', sender: 'Diego Daniel Capitalization', bank: 'Silicon Valley Bank' },
  { date: '2018-10-18T14:20:00.000Z', type: 'Bill Pay', amount: 4850.00, desc: 'Legal & Corporate Structuring Retainer - Wilson Sonsini Goodrich & Rosati', ref: 'INV-WSGR-2018-10', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2018-11-25T11:15:00.000Z', type: 'Deposit', amount: 850000.00, desc: 'Founders Seed Capital Investment - Syndicate Inflow', ref: 'SVB-WIRE-20181125-88', sender: 'Founders Syndicate LLC', bank: 'JPMorgan Chase Bank' },
  { date: '2018-12-14T09:30:00.000Z', type: 'Bill Pay', amount: 28500.00, desc: 'Commercial Office Lease Deposit - Sand Hill Road Campus', ref: 'INV-LEASE-2018-12', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  
  // 2019
  { date: '2019-01-20T16:00:00.000Z', type: 'Bill Pay', amount: 16420.00, desc: 'Cloud Infrastructure Annual Subscription - AWS Enterprise', ref: 'INV-AWS-201901-44', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2019-03-15T11:45:00.000Z', type: 'Deposit', amount: 245000.00, desc: 'Strategic Technology Advisory Retainer - Apex Advisory Partners', ref: 'SVB-WIRE-20190315-12', sender: 'Apex Advisory Partners', bank: 'Morgan Stanley' },
  { date: '2019-05-22T13:10:00.000Z', type: 'Bill Pay', amount: 42800.00, desc: 'Enterprise Hardware & Server Network - Cisco Systems', ref: 'INV-CISCO-201905-09', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2019-07-28T10:30:00.000Z', type: 'Deposit', amount: 4500000.00, desc: 'Series A Venture Capital Capitalization - Sequoia Capital Operations', ref: 'SVB-WIRE-20190728-77', sender: 'Sequoia Capital Growth Desk', bank: 'Silicon Valley Bank' },
  { date: '2019-09-15T15:20:00.000Z', type: 'Bill Pay', amount: 135000.00, desc: 'Q3 Estimated Corporate Tax Payment - US Treasury EFTPS', ref: 'TAX-US-2019-Q3', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2019-11-12T14:00:00.000Z', type: 'Wire Transfer', amount: 350000.00, desc: 'Commercial Real Estate Escrow Earnest Deposit - First American Title', ref: 'ESC-FAT-201911-01', sender: 'Diego Daniel', bank: 'First American Title Escrow' },
  { date: '2019-12-19T10:00:00.000Z', type: 'Deposit', amount: 950000.00, desc: 'Annual Management Dividend Distribution - Operating Surplus', ref: 'SVB-DIV-201912-01', sender: 'Operating Surplus Treasury', bank: 'Silicon Valley Bank' },

  // 2020
  { date: '2020-02-14T11:30:00.000Z', type: 'Bill Pay', amount: 48600.00, desc: 'Enterprise Software Licenses - Microsoft Azure & Office 365', ref: 'INV-MSFT-202002-14', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2020-04-20T14:15:00.000Z', type: 'Deposit', amount: 1850000.00, desc: 'International Inbound Wire - Strategic Licensing Rights (Zurich Partners AG)', ref: 'WIRE-CH-20200420-91', sender: 'Zurich Partners AG', bank: 'UBS Switzerland AG' },
  { date: '2020-06-25T16:45:00.000Z', type: 'Wire Transfer', amount: 1200000.00, desc: 'Commercial Real Estate Escrow Settlement - SF Waterfront Facility', ref: 'ESC-SF-20200625-33', sender: 'Diego Daniel', bank: 'Old Republic National Title' },
  { date: '2020-08-18T10:20:00.000Z', type: 'Deposit', amount: 8200000.00, desc: 'Growth Private Equity Capital Placement - Blackstone Strategic Desk', ref: 'SVB-WIRE-20200818-44', sender: 'Blackstone Strategic Opportunities', bank: 'Goldman Sachs' },
  { date: '2020-10-22T13:40:00.000Z', type: 'Bill Pay', amount: 315400.00, desc: 'AI/ML Compute Infrastructure Clusters - NVIDIA Enterprise', ref: 'INV-NVDA-202010-88', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2020-12-15T11:00:00.000Z', type: 'Deposit', amount: 1420000.00, desc: 'Q4 Preferred Equity Dividend Payout', ref: 'SVB-DIV-202012-02', sender: 'Board Preferred Equity', bank: 'Silicon Valley Bank' },

  // 2021
  { date: '2021-01-28T15:30:00.000Z', type: 'Wire Transfer', amount: 650000.00, desc: 'Outbound Wire - European R&D Operations Expansion (Berlin Hub GmbH)', ref: 'WIRE-DE-20210128-19', sender: 'Diego Daniel', bank: 'Deutsche Bank Frankfurt' },
  { date: '2021-03-16T12:00:00.000Z', type: 'Bill Pay', amount: 88500.00, desc: 'Annual Corporate Audit & Advisory Fees - Ernst & Young LLP', ref: 'INV-EY-202103-16', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2021-05-24T10:15:00.000Z', type: 'Deposit', amount: 12500000.00, desc: 'Growth Equity Treasury Placement - Tiger Global Management', ref: 'SVB-WIRE-20210524-55', sender: 'Tiger Global Management', bank: 'Citibank N.A.' },
  { date: '2021-07-19T14:50:00.000Z', type: 'Bill Pay', amount: 62840.00, desc: 'High-Density Colocation & Fiber Connectivity - Equinix Datacenters', ref: 'INV-EQX-202107-19', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2021-09-10T11:20:00.000Z', type: 'Deposit', amount: 120000.00, desc: 'Commercial Real Estate Escrow Return of Security Deposit', ref: 'ESC-RET-202109-01', sender: 'Old Republic National Title', bank: 'Silicon Valley Bank' },
  { date: '2021-11-30T16:10:00.000Z', type: 'Wire Transfer', amount: 1750000.00, desc: 'Strategic Intellectual Property Portfolio Acquisition - Palo Alto IP', ref: 'WIRE-IP-20211130-99', sender: 'Diego Daniel', bank: 'First Republic Bank' },
  { date: '2021-12-20T10:30:00.000Z', type: 'Deposit', amount: 2100000.00, desc: 'Year-End Executive Performance Dividend - Board Authorized', ref: 'SVB-DIV-202112-03', sender: 'Corporate Treasury Allocation', bank: 'Silicon Valley Bank' },

  // 2022
  { date: '2022-02-18T13:20:00.000Z', type: 'Bill Pay', amount: 74200.00, desc: 'Enterprise Cyber Risk & Executive D&O Insurance - Chubb Group', ref: 'INV-CHUBB-202202-18', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2022-04-14T15:00:00.000Z', type: 'Wire Transfer', amount: 820000.00, desc: 'Semiconductor Fabrication Research Retainer - TSMC North America', ref: 'WIRE-TSMC-20220414-22', sender: 'Diego Daniel', bank: 'Bank of America N.A.' },
  { date: '2022-06-28T11:40:00.000Z', type: 'Deposit', amount: 6450000.00, desc: 'Secondary Shares Strategic Liquidity Inflow - Private Tender Offer', ref: 'SVB-WIRE-20220628-66', sender: 'Institutional Secondary Desk', bank: 'JPMorgan Chase Bank' },
  { date: '2022-08-15T14:10:00.000Z', type: 'Bill Pay', amount: 185420.00, desc: 'Cloud Neural Network Training Infrastructure - AWS AI/ML', ref: 'INV-AWS-202208-72', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2022-10-05T10:50:00.000Z', type: 'Deposit', amount: 980000.00, desc: 'Technology Development Grant Disbursement - National Science Foundation', ref: 'SVB-GRANT-20221005-01', sender: 'US Federal Grant Clearing', bank: 'Federal Reserve Bank' },
  { date: '2022-11-22T16:30:00.000Z', type: 'Wire Transfer', amount: 3450000.00, desc: 'Commercial Campus Acquisition Escrow - Austin Technology Center', ref: 'ESC-ATX-20221122-81', sender: 'Diego Daniel', bank: 'Chicago Title Insurance Co' },
  { date: '2022-12-16T11:15:00.000Z', type: 'Deposit', amount: 3200000.00, desc: 'Preferred Shareholder Annual Dividend Distribution', ref: 'SVB-DIV-202212-04', sender: 'Board Authorized Dividends', bank: 'Silicon Valley Bank' },

  // 2023
  { date: '2023-01-20T14:00:00.000Z', type: 'Bill Pay', amount: 115000.00, desc: 'Corporate Regulatory & SEC Compliance Retainer - Latham & Watkins', ref: 'INV-LW-202301-20', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2023-03-27T10:30:00.000Z', type: 'Deposit', amount: 9500000.00, desc: 'Sovereign Wealth Co-Investment Inflow - Mubadala Tech Fund', ref: 'WIRE-AE-20230327-01', sender: 'Mubadala Technology Investment', bank: 'First Abu Dhabi Bank' },
  { date: '2023-05-15T13:45:00.000Z', type: 'Bill Pay', amount: 92600.00, desc: 'Enterprise Data Warehouse Cloud Subscriptions - Snowflake & Databricks', ref: 'INV-SNOW-202305-15', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2023-07-08T15:20:00.000Z', type: 'Wire Transfer', amount: 2100000.00, desc: 'Commercial Real Estate Escrow Settlement - Austin Tech Park Phase II', ref: 'ESC-ATX-20230708-92', sender: 'Diego Daniel', bank: 'Chicago Title Insurance Co' },
  { date: '2023-09-19T11:00:00.000Z', type: 'Deposit', amount: 385420.00, desc: 'Treasury Money Market Desk Yield & Liquidity Sweep Return', ref: 'SVB-MM-20230919-48', sender: 'SVB Asset Management Desk', bank: 'Silicon Valley Bank' },
  { date: '2023-11-14T14:30:00.000Z', type: 'Bill Pay', amount: 440000.00, desc: 'H100 GPU Cluster Hosting Infrastructure - CoreWeave Cloud', ref: 'INV-CW-202311-14', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2023-12-22T10:45:00.000Z', type: 'Deposit', amount: 2850000.00, desc: 'Annual Board Authorized Executive Dividend Distribution', ref: 'SVB-DIV-202312-05', sender: 'Corporate Treasury Allocation', bank: 'Silicon Valley Bank' },

  // 2024
  { date: '2024-02-10T12:15:00.000Z', type: 'Bill Pay', amount: 168250.00, desc: 'Google Cloud Platform Multi-Region Infrastructure Bill Payment', ref: 'INV-GCP-202402-10', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2024-04-18T14:50:00.000Z', type: 'Deposit', amount: 4250000.00, desc: 'Strategic Joint Venture Patent Licensing Agreement - Geneva Innovations SA', ref: 'WIRE-CH-20240418-55', sender: 'Geneva Innovations SA', bank: 'Credit Suisse Zurich' },
  { date: '2024-06-25T16:00:00.000Z', type: 'Wire Transfer', amount: 950000.00, desc: 'Quantum Computing Applied Research Alliance - MIT Consortium Contract', ref: 'WIRE-MIT-20240625-18', sender: 'Diego Daniel', bank: 'Bank of America N.A.' },
  { date: '2024-08-12T10:30:00.000Z', type: 'Deposit', amount: 3600000.00, desc: 'Institutional Asset Management Fixed Income Portfolio Return', ref: 'SVB-AM-20240812-73', sender: 'SVB Asset Management', bank: 'Silicon Valley Bank' },
  { date: '2024-10-20T15:10:00.000Z', type: 'Wire Transfer', amount: 1500000.00, desc: 'Commercial Real Estate Escrow Deposit - Silicon Valley Executive Facility', ref: 'ESC-SV-20241020-04', sender: 'Diego Daniel', bank: 'First American Title' },
  { date: '2024-12-18T11:00:00.000Z', type: 'Deposit', amount: 3150000.00, desc: 'Annual Corporate Profit Distribution & Executive Dividend', ref: 'SVB-DIV-202412-06', sender: 'Board Dividend Allocation', bank: 'Silicon Valley Bank' },

  // 2025
  { date: '2025-01-25T13:30:00.000Z', type: 'Bill Pay', amount: 210500.00, desc: 'State Franchise Tax & Corporate Filing - California FTB', ref: 'TAX-CA-2025-FTB', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2025-03-30T10:15:00.000Z', type: 'Deposit', amount: 5000000.00, desc: 'International Co-Investment Capital Placement - Global Horizon Fund', ref: 'WIRE-UK-20250330-82', sender: 'Global Horizon Fund Ltd', bank: 'Barclays Bank London' },
  { date: '2025-05-18T14:20:00.000Z', type: 'Bill Pay', amount: 128400.00, desc: 'Silicon Valley Datacenter Facility Lease & Power Redundancy', ref: 'INV-DC-202505-18', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2025-07-22T11:45:00.000Z', type: 'Deposit', amount: 4100000.00, desc: 'Strategic Portfolio M&A Asset Divestiture Liquidity Inflow', ref: 'SVB-MA-20250722-11', sender: 'Acquisition Settlement Escrow', bank: 'Morgan Stanley' },
  { date: '2025-09-15T16:00:00.000Z', type: 'Wire Transfer', amount: 1850000.00, desc: 'Global Semiconductor Supply Chain Escrow Guarantee', ref: 'ESC-SC-20250915-62', sender: 'Diego Daniel', bank: 'Standard Chartered Bank' },
  { date: '2025-11-10T10:30:00.000Z', type: 'Deposit', amount: 2950000.00, desc: 'Enterprise SaaS Annual Contract Treasury Settlement', ref: 'SVB-WIRE-20251110-39', sender: 'Enterprise Client Treasury', bank: 'Silicon Valley Bank' },
  { date: '2025-12-22T11:15:00.000Z', type: 'Deposit', amount: 2500000.00, desc: 'Year-End Executive Board Dividend Distribution', ref: 'SVB-DIV-202512-07', sender: 'Corporate Treasury Allocation', bank: 'Silicon Valley Bank' },

  // 2026
  { date: '2026-01-18T13:40:00.000Z', type: 'Bill Pay', amount: 145200.00, desc: 'Enterprise ERP & Cloud System Integration - Oracle Corporation', ref: 'INV-ORCL-202601-18', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2026-03-12T10:30:00.000Z', type: 'Deposit', amount: 7500000.00, desc: 'Series C Expansion Round Lead Placement - Andreessen Horowitz Lead Desk', ref: 'SVB-WIRE-20260312-99', sender: 'Andreessen Horowitz Growth', bank: 'Silicon Valley Bank' },
  { date: '2026-05-20T15:00:00.000Z', type: 'Wire Transfer', amount: 2800000.00, desc: 'Commercial Real Estate Development Outbound Wire - Austin Tech Expansion', ref: 'WIRE-ATX-20260520-41', sender: 'Diego Daniel', bank: 'JPMorgan Chase Bank' },
  { date: '2026-07-14T11:20:00.000Z', type: 'Deposit', amount: 1950000.00, desc: 'Global Intellectual Property Patent Royalties Inflow', ref: 'SVB-ROY-20260714-83', sender: 'Global IP Licensing Pool', bank: 'Citibank N.A.' },
  { date: '2026-08-25T14:10:00.000Z', type: 'Bill Pay', amount: 175000.00, desc: 'Enterprise AI Safety & Cybersecurity Audit - Palo Alto Networks', ref: 'INV-PANW-202608-25', sender: 'Diego Daniel', bank: 'Silicon Valley Bank' },
  { date: '2026-09-10T11:00:00.000Z', type: 'Wire Transfer', amount: 20754872.91, desc: 'Outbound Wire Transfer - Institutional Asset Acquisition & Strategic Treasury Allocation', ref: 'WIRE-SVB-20260910-01', sender: 'Diego Daniel', bank: 'Goldman Sachs Treasury' }
];

export const diegoDanielTransactions: Transaction[] = rawHistoricalRecords.map((r, idx) => ({
  id: `TXN-DD-${r.date.slice(0, 10).replace(/-/g, '')}-${String(idx + 1).padStart(3, '0')}`,
  userId: 'usr-1789251720568',
  userEmail: 'diegodaniel5136@outlook.com',
  userName: 'Diego Daniel',
  accountNumber: '103689014282',
  senderName: r.type === 'Deposit' ? r.sender : 'Diego Daniel',
  senderAccountNumber: r.type === 'Deposit' ? '9842109823' : '103689014282',
  recipientName: r.type === 'Deposit' ? 'Diego Daniel' : r.sender,
  recipientAccountNumber: r.type === 'Deposit' ? '103689014282' : '9842109823',
  destinationBank: r.bank,
  destinationCountry: 'United States',
  transferType: 'Domestic',
  amount: r.amount,
  currency: 'USD',
  type: r.type as TransactionType,
  status: 'Completed',
  reference: r.ref,
  description: r.desc,
  createdAt: r.date,
  updatedAt: r.date
}));

export const diegoDanielPassword = 'Diego51366414$$&&@@';
