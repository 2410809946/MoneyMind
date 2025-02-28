# Finance Analyzer

## Overview
Finance Analyzer is a simple offline application designed to help users analyze their financial data stored in CSV format. The application allows users to perform calculations and generate statistics interactively, using a local browser for visualization.

## Features
- Parse CSV files to extract financial data.
- Perform various financial calculations such as total, average, and statistics generation.
- Visualize data through interactive charts.
- User-friendly interface for easy navigation and data analysis.

## Project Structure
```
finance-analyzer
├── src
│   ├── css
│   │   └── styles.css        # Styles for the application
│   ├── js
│   │   ├── main.js           # Entry point for JavaScript code
│   │   ├── csvParser.js      # Functions for parsing CSV files
│   │   ├── calculations.js    # Functions for financial calculations
│   │   └── charts.js         # Functions for generating charts
│   ├── index.html            # Main HTML file for the application
│   └── assets
│       └── favicon.svg       # Favicon for the application
├── data
│   └── sample.csv            # Sample financial data in CSV format
├── package.json               # Configuration file for npm
└── README.md                  # Documentation for the project
```

## Getting Started
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/finance-analyzer.git
   ```
2. Navigate to the project directory:
   ```
   cd finance-analyzer
   ```
3. Open `src/index.html` in your local browser to start using the application.

## Usage
- Load your financial data in CSV format using the provided interface.
- Utilize the various features to analyze your data and generate insights.
- Explore the visualizations to better understand your financial situation.

## Contributing
Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License
This project is licensed under the MIT License. See the LICENSE file for details.