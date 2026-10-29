import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import Overview from '@/pages/Overview'

const GrowZones = lazy(() => import('@/pages/GrowZones'))
const Crops = lazy(() => import('@/pages/Crops'))
const Environment = lazy(() => import('@/pages/Environment'))
const Water = lazy(() => import('@/pages/Water'))
const EquipmentPage = lazy(() => import('@/pages/Equipment'))
const Alerts = lazy(() => import('@/pages/Alerts'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const SettingsPage = lazy(() => import('@/pages/Settings'))

const Loading = () => <div role="status" className="py-24 text-center text-sm text-mute">Loading…</div>

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Overview />} />
            <Route path="zones" element={<GrowZones />} />
            <Route path="crops" element={<Crops />} />
            <Route path="environment" element={<Environment />} />
            <Route path="water" element={<Water />} />
            <Route path="equipment" element={<EquipmentPage />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
