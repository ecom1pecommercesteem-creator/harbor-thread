import { Activity, AlertTriangle, BarChart3, Droplets, LayoutDashboard, Leaf, Settings, Sprout, Thermometer, Wrench, type LucideIcon } from 'lucide-react'

export interface NavItem { to: string; label: string; icon: LucideIcon; blurb: string }
export const NAV: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, blurb: 'Farm-wide status at a glance' },
  { to: '/zones', label: 'Grow Zones', icon: Sprout, blurb: 'Zones, racks and conditions' },
  { to: '/crops', label: 'Crops & Batches', icon: Leaf, blurb: 'Production batches and harvest ETAs' },
  { to: '/environment', label: 'Environment', icon: Thermometer, blurb: 'Temperature, humidity, CO₂ and light' },
  { to: '/water', label: 'Water & Nutrients', icon: Droplets, blurb: 'Reservoirs, pH, EC and irrigation' },
  { to: '/equipment', label: 'Equipment', icon: Wrench, blurb: 'Pumps, lights, HVAC and sensors' },
  { to: '/alerts', label: 'Alerts', icon: AlertTriangle, blurb: 'Acknowledge and resolve issues' },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, blurb: 'Yield and resource performance' },
  { to: '/settings', label: 'Settings', icon: Settings, blurb: 'Targets, thresholds and preferences' },
]
export const navFor = (path: string) => NAV.find((n) => n.to === path) ?? NAV[0]
export const LiveIcon = Activity
