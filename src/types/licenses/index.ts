export interface UsageTerm {
  icon: React.ReactNode; // could be imported from lucide-react
  label: string;
}

export interface License {
  id: string;
  name: string;
  price: number;
  includedFiles: string[]; // e.g. ['MP3', 'WAV', 'STEMS']
  usageTerms: UsageTerm[];
} 