export interface Visitor {
  id: string;
  name: string;
  icOrPassport: string;
  phone: string;
  vehiclePlate: string;
  purpose: string;
  checkInTime: string;
  checkOutTime: string | null;
  status: 'ACTIVE' | 'CHECKED_OUT';
}
