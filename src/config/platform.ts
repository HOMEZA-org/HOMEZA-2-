import { PlatformConfig } from '../types';

export const PLATFORM_CONFIG: PlatformConfig = {
  appName: 'HOMEZA',
  tagline: 'Find verified homes. Connect with trusted property providers.',
  description:
    'HOMEZA is a trusted rental marketplace that connects tenants with verified properties and trusted landlords and property agents, making it easier to discover, communicate, and arrange property inspections — all in one place.',
  defaultState: 'Akwa Ibom State',
  defaultCity: 'Uyo',
  currencySymbol: '₦',
  supportPhone: '+234 802 345 6789',
  supportEmail: 'support@homeza.com.ng',
  address: 'Udo Udoma Avenue, Uyo, Akwa Ibom State, Nigeria',
  minInspectionFee: 3000,
  maxInspectionFee: 5000,
  defaultInspectionFee: 3000,
  inspectionFeeAmount: 3000,
  paystackPublicKey: (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_021108ccdb019dcbdb0d2aa29543eb815a9a963d',
};

export const STANDARD_UYO_AREAS = [
  'Ewet Housing Estate',
  'Shelter Afrique Estate',
  'Osongama Estate',
  'Oron Road',
  'Udo Udoma Avenue',
  'Nwaniba Road',
  'Four Lanes (Edet Akpan Avenue)',
  'Ring Road 3',
  'Itam',
  'Abak Road',
  'Ikpa Road (UniUyo)',
  'Aka Road',
  'Aka Itiam',
  'Stadium Road',
  'General Hospital / Anua',
  'Wellington Bassey Way',
  'Atiku Abubakar Way',
  'Idoro Road',
  'Banking Layout / Udo Udoma',
  'Nelson Mandela Street',
  'IBB Way',
] as const;

export const ALL_PROPERTY_TYPES = [
  'Self-contained',
  'Room and parlour',
  '1-bedroom',
  '2-bedroom',
  '3-bedroom',
  '4-bedroom',
  '5+ bedroom',
  'Duplex',
  'Detached house',
  'Semi-detached house',
  'Full compound',
  'Shared apartment',
  'Other',
] as const;

export const ALL_FACILITIES = [
  'Tiled floor',
  'POP ceiling',
  'Borehole',
  'Water supply',
  'Electricity',
  'Prepaid meter',
  'Dedicated transformer',
  'Parking',
  'Fenced compound',
  'Security',
  'Kitchen cabinets',
  'Wardrobe',
  'Air conditioning',
  'Generator',
  'Internet',
  'Balcony',
  'Garden',
  'Paved compound',
  'Water heater',
] as const;

export const MEDIA_CATEGORIES = [
  'Exterior',
  'Living room',
  'Bedroom',
  'Kitchen',
  'Bathroom',
  'Toilet',
  'Compound',
  'Other',
] as const;

export function formatNaira(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₦0';
  const safeAmount = Math.max(0, Math.floor(amount));
  return '₦' + safeAmount.toLocaleString('en-NG');
}
