export function deliveryLabel(value?: string) {
    if (value === 'delivered') return 'Delivered';
    if (value === 'sent') return 'Sent';
    if (value === 'bounced') return 'Bounced';
    if (value === 'failed') return 'Delivery problem';
    return 'Unknown';
}
