import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { Link } from 'react-router-dom'

export default function Upcoming() {
  const [events, setEvents]     = useState([])
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [editingPhone, setEditingPhone] = useState(null)
  const [phoneVal, setPhoneVal] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const [{ data: evs }, { data: prof }] = await Promise.all([
        supabase.from('calendar_events').select('*').eq('user_id', user.id).order('start_time').limit(200),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ])
      setEvents(evs || [])
      setProfile(prof)
      setLoading(false)
    }
    load()
  }, [])

  function getWeekDays(offset) {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1) + offset * 7)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }

  const weekDays = getWeekDays(weekOffset)
  const hours = Array.from({ length: 16 }, (_, i) => i + 6) // 06:00–21:00

  function getEventsForSlot(day, hour) {
    return events.filter(e => {
      const start = new Date(e.start_time)
      return start.toDateString() === day.toDateString() && start.getHours() === hour
    })
  }

  async function savePhone(eventId) {
    await supabase.from('calendar_events').update({ phone: phoneVal }).eq('id', eventId)
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, phone: phoneVal } : e))
    setEditingPhone(null)
    setPhoneVal('')
  }

  const todayStr = new Date().toDateString()
  const purple = '#a855f7'
  const border = '#e9d5ff'
  const muted = '#6b7280'
  const text = '#1a1a2e'
  const green = '#22c55e'

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: text, marginBottom: 4, fontFamily: 'Syne,sans-serif' }}>
            Upcoming Appointments
          </h1>
          <div style={{ fontSize: 13, color: muted, display: 'flex', alignItems: 'center', gap: 8 }}>
            {profile?.calendar_provider ? (
              <><span style={{ width: 6, height: 6, borderRadius: '50%', background: green, display: 'inline-block' }} /> Synced from {profile.calendar_provider} calendar</>
            ) : (
              <><span style={{ color: '#f59e0b' }}>⚠</span> No calendar connected — <Link to="/settings" style={{ color: purple, fontWeight: 600 }}>connect one in Settings</Link></>
            )}
          </div>
        </div>
        {/* Week navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setWeekOffset(p => p - 1)} style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: text, fontFamily: 'inherit' }}>← Prev</button>
          <button onClick={() => setWeekOffset(0)} style={{ background: weekOffset === 0 ? '#f3e8ff' : '#fff', border: `1px solid ${weekOffset === 0 ? purple : border}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: weekOffset === 0 ? purple : text, fontFamily: 'inherit' }}>This Week</button>
          <button onClick={() => setWeekOffset(p => p + 1)} style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: text, fontFamily: 'inherit' }}>Next →</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: muted }}>Loading...</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'auto' }}>
          {/* Day header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7,1fr)', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
            <div style={{ padding: '10px 8px' }} />
            {weekDays.map((day, i) => {
              const isToday = day.toDateString() === todayStr
              return (
                <div key={i} style={{ padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid #f1f5f9', background: isToday ? '#fdf4ff' : '#fff' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? purple : muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: isToday ? purple : text, marginTop: 2 }}>
                    {day.getDate()}
                  </div>
                  <div style={{ fontSize: 10, color: muted }}>
                    {day.toLocaleDateString('en-GB', { month: 'short' })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Hour rows */}
          {hours.map(hour => (
            <div key={hour} style={{ display: 'grid', gridTemplateColumns: '60px repeat(7,1fr)', borderBottom: '1px solid #f8fafc', minHeight: 56 }}>
              <div style={{ padding: '8px 8px 0', fontSize: 11, color: '#94a3b8', fontWeight: 600, borderRight: '1px solid #f1f5f9' }}>
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDays.map((day, di) => {
                const slotEvents = getEventsForSlot(day, hour)
                const isToday = day.toDateString() === todayStr
                return (
                  <div key={di} style={{ borderLeft: '1px solid #f1f5f9', padding: '3px 4px', background: isToday ? '#fefcff' : '#fff', minHeight: 56 }}>
                    {slotEvents.map(ev => (
                      <div key={ev.id} style={{ background: 'linear-gradient(135deg,#f3e8ff,#fdf4ff)', border: `1px solid ${border}`, borderRadius: 6, padding: '4px 7px', marginBottom: 3, borderLeft: `3px solid ${purple}` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: text, lineHeight: 1.3 }}>
                          {new Date(ev.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} {ev.title}
                        </div>
                        {editingPhone === ev.id ? (
                          <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                            <input
                              value={phoneVal}
                              onChange={e => setPhoneVal(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') savePhone(ev.id); if (e.key === 'Escape') setEditingPhone(null) }}
                              placeholder="07700 900123"
                              autoFocus
                              style={{ flex: 1, fontSize: 10, padding: '3px 6px', border: `1px solid ${purple}`, borderRadius: 4, outline: 'none', fontFamily: 'inherit' }}
                            />
                            <button onClick={() => savePhone(ev.id)} style={{ background: purple, color: '#fff', border: 'none', borderRadius: 4, padding: '3px 7px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>✓</button>
                            <button onClick={() => setEditingPhone(null)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 4, padding: '3px 7px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                          </div>
                        ) : (
                          <div
                            onClick={() => { setEditingPhone(ev.id); setPhoneVal(ev.phone || '') }}
                            style={{ fontSize: 10, color: ev.phone ? green : '#94a3b8', marginTop: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                          >
                            📱 {ev.phone || 'Add phone'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
