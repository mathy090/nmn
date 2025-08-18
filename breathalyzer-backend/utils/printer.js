// utils/printer.js
const net = require('net');
require('dotenv').config();

// Generate receipt content with fine calculation
const generateReceiptContent = (data) => {
  const {
    idNumber,
    gender,
    identifier,
    numberPlate,
    alcoholLevel,
    fineAmount,
    timestamp,
    location,
    status,
    notes
  } = data;
  
  const date = new Date(timestamp);
  const formattedDate = date.toLocaleDateString();
  const formattedTime = date.toLocaleTimeString();
  
  // Fine description
  let fineDescription = 'Within Legal Limit';
  if (alcoholLevel > 0.08) {
    if (alcoholLevel <= 0.15) {
      fineDescription = 'Exceeding Legal Limit (0.08-0.15 mg/L)';
    } else if (alcoholLevel <= 0.30) {
      fineDescription = 'High Alcohol Level (0.15-0.30 mg/L)';
    } else {
      fineDescription = 'Very High Alcohol Level (>0.30 mg/L)';
    }
  }
  
  // Simple text-based receipt for thermal printers
  return `
╔══════════════════════════════════════╗
║         BREATHALYZER TEST            ║
║           OFFICIAL RECEIPT           ║
╠══════════════════════════════════════╣
║ Date: ${formattedDate.padEnd(28)} ║
║ Time: ${formattedTime.padEnd(28)} ║
║ Location: ${location.padEnd(25)} ║
╠══════════════════════════════════════╣
║ ID Number: ${idNumber.padEnd(22)} ║
║ Gender: ${gender.padEnd(27)} ║
║ Identifier: ${identifier.padEnd(22)} ║
║ Plate: ${numberPlate.padEnd(27)} ║
╠══════════════════════════════════════╣
║ Alcohol Level: ${alcoholLevel.toFixed(2).padEnd(19)} mg/L ║
║ Status: ${status.toUpperCase().padEnd(23)} ║
╠══════════════════════════════════════╣
║ Fine Description:                    ║
║ ${fineDescription.padEnd(30)} ║
║ Fine Amount: $${fineAmount.toFixed(2).padEnd(22)} ║
╠══════════════════════════════════════╣
║ Notes: ${notes ? notes.substring(0, 27).padEnd(27) : ''.padEnd(27)} ║
╠══════════════════════════════════════╣
║ Officer ID: ${data.officerId.toString().substring(0, 20).padEnd(20)} ║
║ Device: ${data.deviceSerial.padEnd(25)} ║
╠══════════════════════════════════════╣
║ This is an official document and     ║
║ should be kept for legal records.    ║
╚══════════════════════════════════════╝
  `;
};

// Print receipt via network printer
const printNetwork = (content, copies) => {
  return new Promise((resolve, reject) => {
    const printerIp = process.env.PRINTER_IP;
    const printerPort = parseInt(process.env.PRINTER_PORT);
    
    if (!printerIp || !printerPort) {
      return reject(new Error('Network printer IP or PORT not configured'));
    }
    
    const client = new net.Socket();
    client.setTimeout(5000);
    
    client.connect(printerPort, printerIp, () => {
      console.log(`Connected to network printer at ${printerIp}:${printerPort}`);
      
      // Send multiple copies
      for (let i = 0; i < copies; i++) {
        client.write(content);
        client.write('\n\n\n'); // Feed lines
      }
      
      // Cut paper (ESC/POS command)
      client.write('\x1D\x56\x00');
      
      client.end();
    });
    
    client.on('data', (data) => {
      console.log('Received from printer:', data.toString());
    });
    
    client.on('close', () => {
      console.log('Network printer connection closed');
      resolve({ 
        success: true, 
        method: 'network',
        message: `Receipt printed successfully (${copies} copies)` 
      });
    });
    
    client.on('error', (err) => {
      console.error('Network printer error:', err);
      reject(new Error(`Failed to print via network: ${err.message}`));
    });
    
    client.on('timeout', () => {
      client.destroy();
      reject(new Error('Network printer connection timeout'));
    });
  });
};

// Print receipt via USB (simulation)
const printUSB = (content, copies) => {
  return new Promise((resolve, reject) => {
    console.warn('USB printing is simulated. In production, use a library like escpos.');
    
    // Simulate USB printing process
    setTimeout(() => {
      console.log('USB Printer Output:');
      console.log(content);
      resolve({ 
        success: true, 
        method: 'usb',
        message: `Receipt sent to USB printer (${copies} copies) - SIMULATED` 
      });
    }, 1000);
  });
};

// Print receipt via Bluetooth (simulation)
const printBluetooth = (content, copies) => {
  return new Promise((resolve, reject) => {
    console.warn('Bluetooth printing is simulated. In production, use a library like escpos.');
    
    // Simulate Bluetooth printing process
    setTimeout(() => {
      console.log('Bluetooth Printer Output:');
      console.log(content);
      resolve({ 
        success: true, 
        method: 'bluetooth',
        message: `Receipt sent to Bluetooth printer (${copies} copies) - SIMULATED` 
      });
    }, 1500);
  });
};

// Main print function that selects the method based on config
const printReceipt = async (data, copies = 1) => {
  try {
    const content = generateReceiptContent(data);
    const printerType = process.env.PRINTER_TYPE || 'network';
    
    switch (printerType.toLowerCase()) {
      case 'network':
        return await printNetwork(content, copies);
        
      case 'usb':
        return await printUSB(content, copies);
        
      case 'bluetooth':
        return await printBluetooth(content, copies);
        
      default:
        throw new Error(`Unsupported printer type: ${printerType}`);
    }
  } catch (error) {
    console.error('Print receipt error:', error);
    throw error;
  }
};

module.exports = { printReceipt };