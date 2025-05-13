import type { ClerkAppearance } from '@clerk/types';

export const sharedClerkAppearance: ClerkAppearance = {
  variables: {
    colorPrimary: '#00ffff', // cyan-glow (approx)
    colorText: '#e5e5e5', // neutral-200 (approx for text on dark bg)
    colorBackground: '#1f2023', // approx neutral-800 / abyss-blue darker variant
    colorInputBackground: '#2a2b2f', // approx neutral-800 lighter variant / input bg
    colorInputText: '#e5e5e5',
    borderRadius: '0.5rem', // consistent with shadcn/ui large radius
    //fontFamily: 'var(--font-sans)', // if you have a global font variable
  },
  elements: {
    card: {
      backgroundColor: 'var(--clerk-bg, #17181a)', // abyss-blue or slightly lighter
      border: '1px solid #3a3b3f', // approx neutral-700
      boxShadow: '0 4px 12px rgba(0, 255, 255, 0.1)', // subtle cyan glow
      width: '400px',
    },
    headerTitle: {
      color: '#f5f5f5', // neutral-100
    },
    headerSubtitle: {
      color: '#a3a3a3', // neutral-400
    },
    socialButtonsBlockButton: {
      borderColor: '#4a4b4f', // approx neutral-600
      '&:hover': {
        backgroundColor: '#2a2b2f',
      },
    },
    socialButtonsProviderIcon: {
        color: '#d4d4d4', // neutral-300
    },
    dividerLine: {
      backgroundColor: '#3a3b3f',
    },
    dividerText: {
      color: '#a3a3a3',
    },
    formFieldLabel: {
      color: '#d4d4d4',
    },
    formFieldInput: {
      backgroundColor: 'var(--clerk-input-bg, #2a2b2f)',
      borderColor: '#4a4b4f',
      '&:focus': {
        borderColor: 'var(--clerk-primary, #00ffff)',
        boxShadow: '0 0 0 1px var(--clerk-primary, #00ffff)',
      },
    },
    formButtonPrimary: {
      backgroundColor: 'var(--clerk-primary, #00ffff)',
      color: '#0d1117', // dark color for text on cyan button
      '&:hover': {
        backgroundColor: '#00e0e0',
      },
      '&:focus': {
        boxShadow: '0 0 0 2px var(--clerk-bg), 0 0 0 4px var(--clerk-primary)',
      },
      '&:active': {
        backgroundColor: '#00cccc',
      },
    },
    formButtonReset:{
        color: '#a3a3a3',
        '&:hover': {
            color: '#d4d4d4',
        }
    },
    footerActionText:{
        color: '#a3a3a3',
    },
    footerActionLink: {
      color: 'var(--clerk-primary, #00ffff)',
      fontWeight: '500',
      '&:hover': {
        textDecoration: 'underline',
        color: '#00e0e0',
      },
    },
    // For UserButton specific popover (can be merged or kept separate)
    userButtonPopoverCard: {
      backgroundColor: 'var(--clerk-bg, #17181a)',
      border: '1px solid #3a3b3f',
    },
    userButtonPopoverActions: {
      // color: '#e5e5e5', // Handled by action buttons below
    },
    userButtonPopoverActionButton: {
      color: '#d4d4d4', 
      '&:hover': {
        backgroundColor: '#2a2b2f',
        color: '#f5f5f5',
      }
    },
    userButtonPopoverActionButton__manageAccount: {
        // inherits above, can add specifics if needed
    },
    userButtonPopoverActionButton__signOut: {
      color: '#f87171', // red-400
      '&:hover': {
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        color: '#ef4444', // red-500
      }
    }
  }
}; 