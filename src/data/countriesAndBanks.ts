export interface CountryBanks {
  country: string;
  code: string;
  banks: string[];
}

export const COUNTRIES_AND_BANKS: CountryBanks[] = [
  {
    country: 'United States',
    code: 'US',
    banks: [
      'Silicon Valley Bank (SVB)',
      'JPMorgan Chase Bank',
      'Bank of America',
      'Wells Fargo Bank',
      'Citibank N.A.',
      'Morgan Stanley Private Bank',
      'Goldman Sachs Bank',
      'Capital One',
      'US Bank',
      'PNC Bank',
      'Truist Bank'
    ]
  },
  {
    country: 'United Kingdom',
    code: 'GB',
    banks: [
      'Barclays Bank PLC',
      'HSBC UK Bank PLC',
      'Lloyds Bank PLC',
      'NatWest (National Westminster Bank)',
      'Standard Chartered Bank',
      'Royal Bank of Scotland (RBS)',
      'Santander UK',
      'Coutts & Co.',
      'Monzo Bank'
    ]
  },
  {
    country: 'Switzerland',
    code: 'CH',
    banks: [
      'UBS Group AG',
      'Credit Suisse (UBS Division)',
      'Julius Baer Group',
      'Zurich Cantonal Bank (ZKB)',
      'Lombard Odier',
      'Banque Pictet & Cie',
      'PostFinance AG'
    ]
  },
  {
    country: 'Germany',
    code: 'DE',
    banks: [
      'Deutsche Bank AG',
      'Commerzbank AG',
      'KfW Bankengruppe',
      'DZ Bank AG',
      'HypoVereinsbank (UniCredit)',
      'Landesbank Baden-Württemberg',
      'N26 Bank'
    ]
  },
  {
    country: 'France',
    code: 'FR',
    banks: [
      'BNP Paribas S.A.',
      'Crédit Agricole Group',
      'Société Générale',
      'BPCE Group (Natixis / Banque Populaire)',
      'Crédit Mutuel',
      'La Banque Postale'
    ]
  },
  {
    country: 'Canada',
    code: 'CA',
    banks: [
      'Royal Bank of Canada (RBC)',
      'TD Canada Trust',
      'Bank of Nova Scotia (Scotiabank)',
      'BMO Bank of Montreal',
      'Canadian Imperial Bank of Commerce (CIBC)',
      'National Bank of Canada'
    ]
  },
  {
    country: 'Japan',
    code: 'JP',
    banks: [
      'Mitsubishi UFJ Financial Group (MUFG)',
      'Sumitomo Mitsui Banking Corporation (SMBC)',
      'Mizuho Bank',
      'Japan Post Bank',
      'Resona Bank',
      'Nomura Trust and Banking'
    ]
  },
  {
    country: 'Singapore',
    code: 'SG',
    banks: [
      'DBS Bank Ltd',
      'OCBC Bank (Oversea-Chinese Banking Corp)',
      'United Overseas Bank (UOB)',
      'Standard Chartered Bank Singapore',
      'Maybank Singapore'
    ]
  },
  {
    country: 'Australia',
    code: 'AU',
    banks: [
      'Commonwealth Bank of Australia (CBA)',
      'ANZ Bank (Australia & New Zealand Banking Group)',
      'Westpac Banking Corporation',
      'National Australia Bank (NAB)',
      'Macquarie Bank'
    ]
  },
  {
    country: 'United Arab Emirates',
    code: 'AE',
    banks: [
      'Emirates NBD',
      'First Abu Dhabi Bank (FAB)',
      'Abu Dhabi Commercial Bank (ADCB)',
      'Dubai Islamic Bank',
      'Mashreq Bank',
      'Commercial Bank of Dubai'
    ]
  },
  {
    country: 'Saudi Arabia',
    code: 'SA',
    banks: [
      'Saudi National Bank (SNB)',
      'Al Rajhi Bank',
      'Riyad Bank',
      'Saudi British Bank (SABB)',
      'Alinma Bank'
    ]
  },
  {
    country: 'India',
    code: 'IN',
    banks: [
      'State Bank of India (SBI)',
      'HDFC Bank Ltd',
      'ICICI Bank Ltd',
      'Axis Bank Ltd',
      'Kotak Mahindra Bank',
      'Punjab National Bank (PNB)',
      'Bank of Baroda'
    ]
  },
  {
    country: 'China',
    code: 'CN',
    banks: [
      'Industrial and Commercial Bank of China (ICBC)',
      'China Construction Bank (CCB)',
      'Bank of China (BOC)',
      'Agricultural Bank of China (ABC)',
      'Bank of Communications',
      'China Merchants Bank'
    ]
  },
  {
    country: 'Hong Kong',
    code: 'HK',
    banks: [
      'HSBC Hong Kong',
      'Bank of China (Hong Kong)',
      'Hang Seng Bank',
      'Standard Chartered Hong Kong',
      'DBS Bank Hong Kong'
    ]
  },
  {
    country: 'South Korea',
    code: 'KR',
    banks: [
      'KB Kookmin Bank',
      'Shinhan Bank',
      'Hana Bank',
      'Woori Bank',
      'Industrial Bank of Korea (IBK)',
      'KakaoBank'
    ]
  },
  {
    country: 'Brazil',
    code: 'BR',
    banks: [
      'Itaú Unibanco',
      'Banco do Brasil',
      'Banco Bradesco',
      'Banco Santander Brasil',
      'BTG Pactual',
      'Nubank'
    ]
  },
  {
    country: 'Mexico',
    code: 'MX',
    banks: [
      'BBVA México',
      'Banorte',
      'Santander México',
      'Citibanamex',
      'HSBC México',
      'Scotiabank Inverlat'
    ]
  },
  {
    country: 'Netherlands',
    code: 'NL',
    banks: [
      'ING Group NV',
      'ABN AMRO Bank NV',
      'Rabobank',
      'de Volksbank'
    ]
  },
  {
    country: 'Spain',
    code: 'ES',
    banks: [
      'Banco Santander S.A.',
      'BBVA (Banco Bilbao Vizcaya Argentaria)',
      'CaixaBank',
      'Banco Sabadell',
      'Bankinter'
    ]
  },
  {
    country: 'Italy',
    code: 'IT',
    banks: [
      'Intesa Sanpaolo S.p.A.',
      'UniCredit S.p.A.',
      'Banco BPM',
      'Banca Monte dei Paschi di Siena',
      'BPER Banca'
    ]
  },
  {
    country: 'Nigeria',
    code: 'NG',
    banks: [
      'Access Bank PLC',
      'Zenith Bank PLC',
      'Guaranty Trust Bank (GTBank)',
      'First Bank of Nigeria',
      'United Bank for Africa (UBA)',
      'Fidelity Bank'
    ]
  },
  {
    country: 'South Africa',
    code: 'ZA',
    banks: [
      'Standard Bank of South Africa',
      'FirstRand Bank (FNB)',
      'ABSA Bank Group',
      'Nedbank Group',
      'Capitec Bank'
    ]
  },
  {
    country: 'International / Other',
    code: 'INT',
    banks: [
      'SWIFT Correspondent Global Bank',
      'International Clearing Bank',
      'Offshore Treasury Clearing'
    ]
  }
];
