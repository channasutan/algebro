#!/bin/bash
set -e

export PATH="$HOME/.volta/bin:$PATH"

echo "Installing button..."
npx shadcn@latest add button -y
echo "Installing input..."
npx shadcn@latest add input -y
echo "Installing label..."
npx shadcn@latest add label -y
echo "Installing card..."
npx shadcn@latest add card -y
echo "Installing avatar..."
npx shadcn@latest add avatar -y
echo "Installing badge..."
npx shadcn@latest add badge -y
echo "Installing collapsible..."
npx shadcn@latest add collapsible -y
echo "Installing dropdown-menu..."
npx shadcn@latest add dropdown-menu -y
echo "Installing navigation-menu..."
npx shadcn@latest add navigation-menu -y
echo "Installing separator..."
npx shadcn@latest add separator -y
echo "Installing skeleton..."
npx shadcn@latest add skeleton -y
echo "Installing sonner..."
npx shadcn@latest add sonner -y
echo "Installing tooltip..."
npx shadcn@latest add tooltip -y

echo "Installing form..."
npx shadcn@latest add form -y
echo "Installing textarea..."
npx shadcn@latest add textarea -y

echo "All components installed successfully."
