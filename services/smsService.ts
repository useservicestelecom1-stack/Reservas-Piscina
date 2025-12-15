// Simulación de servicio SMS
// En producción, esto se conectaría a un proveedor como Twilio, AWS SNS, o Infobip.

export const sendSMS = async (phoneNumber: string, message: string): Promise<boolean> => {
    // Validación básica de número
    if (!phoneNumber || phoneNumber.length < 7) {
        console.warn("[SMS SERVICE] Número inválido:", phoneNumber);
        return false;
    }

    console.log(`%c[SMS SERVICE] Enviando a ${phoneNumber}...`, 'color: cyan; font-weight: bold;');
    
    // Simular latencia de red de un proveedor de SMS
    await new Promise(resolve => setTimeout(resolve, 800));

    console.log(`%c[SMS SENT] 📨 To: ${phoneNumber} | Msg: "${message}"`, 'color: #4ade80; background: #064e3b; font-weight: bold; padding: 4px; border-radius: 4px;');
    
    return true;
};