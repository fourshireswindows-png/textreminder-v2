import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase.js'
import { Link, useLocation } from 'react-router-dom'

const DEFAULT_TEMPLATES = [
  { id: 1, name: 'Appointment Reminder' },
  { id: 2, name: 'Day-of Reminder' },
  { id: 3, name: 'Quick Reminder' },
]

// Self-contained modal — owns its own phonesVal state so typing never re-renders Upcoming
function PhoneEditModal({ initialPhones, onSave, onClose }) {
  const purple = '#a855f7'
  const pink   = '#ec4899'
  const text   = '#1a1a2e'
  const [phones, setPhones] = useState(initialPhones)
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:360, boxShadow:'0 16px 50px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:15, fontWeight:700, color:text, marginBottom:16 }}>Phone Numbers</div>
        <PhonesInput phones={phones} onChange={setPhones} />
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:18 }}>
          <button onClick={onClose}
            style={{ background:'#f1f5f9', color:'#64748b', border:'none', borderRadius:8, padding:'9px 18px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={() => onSave(phones)}
            style={{ background:`linear-gradient(135deg,${pink},${purple})`, color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Save</button>
        </div>
      </div>
    </div>
  )
}

function PhonesInput({ phones, onChange }) {
  const purple = '#a855f7'
  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 14,
    border: '1px solid #e9d5ff', borderRadius: 7, outline: 'none', fontFamily: 'inherit', color: '#1a1a2e',
  }
  return (
    <div>
      {phones.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <input
            type="tel" inputMode="numeric" value={p}
            onChange={e => { const next = [...phones]; next[i] = e.target.value.replace(/[^0-9+\s]/g, ''); onChange(next) }}
            placeholder={i === 0 ? '07700 900123' : 'Additional number'}
            style={{ ...inputStyle, margin: 0 }}
          />
          {phones.length > 1 && (
            <button onClick={() => onChange(phones.filter((_, j) => j !== i))}
              style={{ flexShrink: 0, width: 30, height: 36, borderRadius: 7, border: '1px solid #fecdd3', background: '#fff5f5', color: '#ef4444', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>x</button>
          )}
        </div>
      ))}
      {phones.length < 5 && (
        <button onClick={() => onChange([...phones, ''])}
          style={{ background: 'none', border: 'none', color: purple, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          + Add another number
        </button>
      )}
    </div>
  )
}

export default function Upcoming() {
  const location = useLocation()
  const [events, setEvents]         = useState([])
  const [profile, setProfile]       = useState(null)
  const [templates, setTemplates]   = useState(DEFAULT_TEMPLATES)
  const [loading, setLoading]       = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [dayOffset, setDayOffset]   = useState(0)
  const [editingPhones, setEditingPhones] = useState(null) // { id, phones }
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [pendingTemplateIds, setPendingTemplateIds] = useState([])
  const [isMobile, setIsMobile]     = useState(window.innerWidth < 768)
  const [syncing, setSyncing]       = useState(false)
  const [syncMsg, setSyncMsg]       = useState('')
  const [viewMode, setViewMode]     = useState(() => localStorage.getItem('tr_viewMode') || 'calendar')
  const [sentThisMonth, setSentThisMonth] = useState(0)

  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    title: '', date: '', time: '09:00', phones: [''], templateId: 1,
    recurring: false, intervalNum: 1, intervalUnit: 'weeks',
    endType: 'date', endDate: '',
  })
  const [savingAdd, setSavingAdd] = useState(false)
  const [addError, setAddError]   = useState('')

  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({
    title: '', date: '', time: '', phones: [''], templateId: 1,
    scope: 'one', changeFreq: false,
    intervalNum: 1, intervalUnit: 'weeks',
    endType: 'date', endDate: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError]   = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const calendarRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  async function loadEvents() {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: evs }, { data: prof }] = await Promise.all([
      supabase.from('calendar_events').select('*').eq('user_id', user.id).order('start_time').limit(200),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const { count: sentCount } = await supabase.from('reminders').select('id', { count:'exact', head:true })
      .eq('user_id', user.id).eq('status', 'sent').gte('sent_at', monthStart)
    setSentThisMonth(sentCount ?? 0)
    setEvents(evs || [])
    setProfile(prof)
    if (prof?.message_templates) setTemplates(prof.message_templates)
    return user.id
  }

  async function syncCalendar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    try {
      await fetch('https://fxzfaxlhhypiigcmlasx.supabase.co/functions/v1/sync-google-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: 'sb_publishable_Z1cXjCDPE95Vo_GByx9kHA_Ff6dhdJO' },
        body: JSON.stringify({ user_id: user.id }),
      })
      await loadEvents()
    } catch (e) {
      console.error('Sync failed', e)
    }
  }

  useEffect(() => {
    async function load() {
      await loadEvents()
      setLoading(false)
    }
    load()
    const interval = setInterval(() => syncCalendar(), 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [location.key])

  useEffect(() => {
    if (!loading && calendarRef.current) {
      calendarRef.current.scrollTop = 9 * 56
    }
  }, [loading])

  async function syncNow() {
    setSyncing(true)
    setSyncMsg('')
    try {
      await loadEvents()
      setSyncMsg('Refreshed')
    } catch (e) {
      setSyncMsg('Failed')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 3000)
    }
  }

  function getEventPhones(ev) {
    if (ev.phones && ev.phones.length > 0) return ev.phones
    if (ev.phone) return [ev.phone]
    return []
  }

  async function savePhones(eventId, phonesArr) {
    const cleaned = phonesArr.map(p => (p || '').trim()).filter(Boolean)
    const primaryPhone = cleaned[0] || null
    const ev = events.find(e => e.id === eventId)
    const groupId = ev?.recurring_group_id
    const recurringEventId = ev?.recurring_event_id

    if (groupId) {
      // Manually created recurring series
      const { error } = await supabase.from('calendar_events')
        .update({ phones: cleaned, phone: primaryPhone })
        .eq('recurring_group_id', groupId)
      if (error) { console.error('Phone save error:', error); return }
      setEvents(prev => prev.map(e => e.recurring_group_id === groupId
        ? { ...e, phones: cleaned, phone: primaryPhone }
        : e))
    } else if (recurringEventId) {
      // Google Calendar recurring series
      const { error } = await supabase.from('calendar_events')
        .update({ phones: cleaned, phone: primaryPhone })
        .eq('recurring_event_id', recurringEventId)
      if (error) { console.error('Phone save error:', error); return }
      setEvents(prev => prev.map(e => e.recurring_event_id === recurringEventId
        ? { ...e, phones: cleaned, phone: primaryPhone }
        : e))
    } else {
      // Single event
      const { error } = await supabase.from('calendar_events')
        .update({ phones: cleaned, phone: primaryPhone })
        .eq('id', eventId)
      if (error) { console.error('Phone save error:', error); return }
      setEvents(prev => prev.map(e => e.id === eventId
        ? { ...e, phones: cleaned, phone: primaryPhone }
        : e))
    }
    setEditingPhones(null)
  }

  async function saveManualAppointment() {
    setAddError('')
    if (!addForm.title.trim()) { setAddError('Please enter a title.'); return }
    if (!addForm.date)         { setAddError('Please pick a date.'); return }
    if (!addForm.time)         { setAddError('Please pick a time.'); return }
    if (addForm.recurring && addForm.endType === 'date' && !addForm.endDate) {
      setAddError('Please pick an end date, or choose "Until cancelled".'); return
    }

    setSavingAdd(true)
    const { data: { user } } = await supabase.auth.getUser()
    const startDt = new Date(`${addForm.date}T${addForm.time}`)
    const endDt   = new Date(startDt.getTime() + 60 * 60 * 1000)
    const cleanedPhones = addForm.phones.map(p => (p || '').trim()).filter(Boolean)
    const primaryPhone  = cleanedPhones[0] || null

    if (!addForm.recurring) {
      const { error } = await supabase.from('calendar_events').insert({
        user_id: user.id, title: addForm.title.trim(),
        start_time: startDt.toISOString(), end_time: endDt.toISOString(),
        external_id: crypto.randomUUID(), phone: primaryPhone, phones: cleanedPhones,
        is_manual: true, reminder_sent: false,
        template_ids: [addForm.templateId || 1],
      })
      if (error) { console.error('Save error:', error); setAddError('Failed to save: ' + (error.message || error.details || 'unknown error')); setSavingAdd(false); return }
    } else {
      const intervalDays = addForm.intervalNum * (addForm.intervalUnit === 'weeks' ? 7 : 1)
      const groupId      = crypto.randomUUID()
      const cutoff = (addForm.endType === 'date' && addForm.endDate)
        ? new Date(`${addForm.endDate}T23:59:59`)
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

      const rows = []
      let cur = new Date(startDt)
      while (cur <= cutoff) {
        rows.push({
          user_id: user.id, title: addForm.title.trim(),
          start_time: new Date(cur).toISOString(),
          end_time: new Date(cur.getTime() + 60 * 60 * 1000).toISOString(),
          external_id: crypto.randomUUID(), phone: primaryPhone, phones: cleanedPhones,
          is_manual: true, reminder_sent: false,
          template_ids: [addForm.templateId || 1],
          recurring_group_id: groupId, recurring_interval_days: intervalDays,
          recurring_end_date: (addForm.endType === 'date' && addForm.endDate) ? addForm.endDate : null,
        })
        cur = new Date(cur.getTime() + intervalDays * 24 * 60 * 60 * 1000)
      }
      if (rows.length === 0) { setAddError('No appointments in that range.'); setSavingAdd(false); return }
      const { error } = await supabase.from('calendar_events').insert(rows)
      if (error) { console.error('Save error:', error); setAddError('Failed to save: ' + (error.message || error.details || 'unknown error')); setSavingAdd(false); return }
    }

    await loadEvents()
    setSavingAdd(false)
    setShowAddModal(false)
    setAddForm({ title: '', date: '', time: '09:00', phones: [''], templateId: 1, recurring: false, intervalNum: 1, intervalUnit: 'weeks', endType: 'date', endDate: '' })
  }

  function openEdit(ev) {
    setEditError('')
    const st = new Date(ev.start_time)
    const timeStr = st.toTimeString().slice(0, 5)
    const dateStr = ev.start_time.slice(0, 10)
    const existingDays = ev.recurring_interval_days || 7
    const isWeeks = existingDays % 7 === 0
    const existingPhones = getEventPhones(ev)
    setEditForm({
      title: ev.title || '', date: dateStr, time: timeStr,
      phones: existingPhones.length ? existingPhones : [''],
      templateId: ev.template_id || 1,
      scope: 'one', changeFreq: false,
      intervalNum: isWeeks ? existingDays / 7 : existingDays,
      intervalUnit: isWeeks ? 'weeks' : 'days',
      endType: ev.recurring_end_date ? 'date' : 'indefinite',
      endDate: ev.recurring_end_date || '',
    })
    setEditTarget(ev)
  }

  async function saveEdit() {
    setEditError('')
    if (!editForm.title.trim()) { setEditError('Please enter a title.'); return }
    if (!editForm.date)         { setEditError('Please pick a date.'); return }
    if (!editForm.time)         { setEditError('Please pick a time.'); return }
    if (editForm.changeFreq && editForm.endType === 'date' && !editForm.endDate) {
      setEditError('Please pick an end date, or choose "Until cancelled".'); return
    }

    setSavingEdit(true)
    const { data: { user } } = await supabase.auth.getUser()
    const newStart = new Date(`${editForm.date}T${editForm.time}`)
    const newEnd   = new Date(newStart.getTime() + 60 * 60 * 1000)
    const cleanedPhones = editForm.phones.map(p => (p || '').trim()).filter(Boolean)
    const primaryPhone  = cleanedPhones[0] || null
    const isRecurring = !!editTarget.recurring_group_id

    if (!isRecurring || editForm.scope === 'one') {
      await supabase.from('calendar_events').update({
        title: editForm.title.trim(), start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        phone: primaryPhone, phones: cleanedPhones,
        template_id: editForm.templateId || 1,
      }).eq('id', editTarget.id)
    } else {
      const intervalDays = editForm.changeFreq
        ? editForm.intervalNum * (editForm.intervalUnit === 'weeks' ? 7 : 1)
        : editTarget.recurring_interval_days
      const endDate = editForm.changeFreq
        ? ((editForm.endType === 'date' && editForm.endDate) ? editForm.endDate : null)
        : editTarget.recurring_end_date
      const cutoff = endDate
        ? new Date(`${endDate}T23:59:59`)
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

      if (editForm.scope === 'future') {
        await supabase.from('calendar_events').delete()
          .eq('recurring_group_id', editTarget.recurring_group_id)
          .gte('start_time', editTarget.start_time)
      } else {
        await supabase.from('calendar_events').delete()
          .eq('recurring_group_id', editTarget.recurring_group_id)
      }

      const rows = []
      let cur = new Date(newStart)
      while (cur <= cutoff) {
        rows.push({
          user_id: user.id, title: editForm.title.trim(),
          start_time: new Date(cur).toISOString(),
          end_time: new Date(cur.getTime() + 60 * 60 * 1000).toISOString(),
          external_id: crypto.randomUUID(), phone: primaryPhone, phones: cleanedPhones,
          is_manual: true, reminder_sent: false,
          template_ids: [addForm.templateId || 1],
          template_id: editForm.templateId || 1,
          recurring_group_id: editTarget.recurring_group_id,
          recurring_interval_days: intervalDays, recurring_end_date: endDate,
        })
        cur = new Date(cur.getTime() + intervalDays * 24 * 60 * 60 * 1000)
      }
      if (rows.length > 0) {
        const { error } = await supabase.from('calendar_events').insert(rows)
        if (error) { setEditError('Failed to save. Try again.'); setSavingEdit(false); return }
      }
    }

    await loadEvents()
    setSavingEdit(false)
    setEditTarget(null)
  }

  async function stopRecurringAfterThis(ev) {
    await supabase.from('calendar_events').delete()
      .eq('recurring_group_id', ev.recurring_group_id)
      .gt('start_time', ev.start_time)
    await supabase.from('calendar_events').update({
      recurring_group_id: null, recurring_interval_days: null, recurring_end_date: null,
    }).eq('id', ev.id)
    setEditTarget(null)
    await loadEvents()
  }

  async function deleteManualEvent(ev, scope) {
    if (scope === 'all' && ev.recurring_group_id) {
      await supabase.from('calendar_events').delete().eq('recurring_group_id', ev.recurring_group_id)
    } else {
      await supabase.from('calendar_events').delete().eq('id', ev.id)
    }
    setDeleteTarget(null)
    await loadEvents()
  }

  function requestDelete(ev) {
    if (ev.recurring_group_id) { setDeleteTarget(ev) }
    else { deleteManualEvent(ev, 'one') }
  }

  function lastSyncedText(evs) {
    const times = (evs || []).map(e => e.last_synced).filter(Boolean)
    if (!times.length) return null
    const latest = new Date(times.sort().at(-1))
    const mins = Math.floor((Date.now() - latest) / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
    const hrs = Math.floor(mins / 60)
    return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  }

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

  function getSingleDay(offset) {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return d
  }

  const weekDays  = getWeekDays(weekOffset)
  const singleDay = getSingleDay(dayOffset)
  const hours     = Array.from({ length: 24 }, (_, i) => i)

  function getEventsForSlot(day, hour) {
    return events.filter(e => {
      const start = new Date(e.start_time)
      return start.toDateString() === day.toDateString() && start.getHours() === hour
    })
  }

  function getEventsForDay(day) {
    return events.filter(e => new Date(e.start_time).toDateString() === day.toDateString())
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  }

  async function commitTemplates(eventId, templateIds) {
    if (!templateIds || !templateIds.length) return
    const ids = templateIds.map(Number)
    const { error } = await supabase.from('calendar_events').update({ template_ids: ids }).eq('id', eventId)
    if (error) { console.error('Template save error:', error); return }
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, template_ids: ids } : e))
    setEditingTemplate(null)
    setPendingTemplateIds([])
  }

  const todayStr = new Date().toDateString()
  const purple = '#a855f7'
  const border = '#e9d5ff'
  const muted  = '#6b7280'
  const text   = '#1a1a2e'
  const green  = '#22c55e'
  const pink   = '#ec4899'

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 14,
    border: `1px solid ${border}`, borderRadius: 7, outline: 'none', fontFamily: 'inherit', color: text,
  }
  const todayIso = new Date().toISOString().split('T')[0]

  function renderAppointmentBlock(ev) {
    const activeIds = (ev.template_ids?.length ? ev.template_ids : [ev.template_id || 1]).map(Number)
    const activeTemplates = templates.filter(t => activeIds.includes(Number(t.id)))
    const currentPhones = getEventPhones(ev)
    const hasPhone = currentPhones.length > 0

    return (
    <div style={{ background: 'linear-gradient(135deg,#f3e8ff,#fdf4ff)', border: `1px solid ${border}`, borderRadius: 6, padding: '4px 7px', marginBottom: 3, borderLeft: `3px solid ${ev.is_manual ? pink : purple}`, position: 'relative' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: text, lineHeight: 1.3, paddingRight: ev.is_manual ? 34 : 0, display: 'flex', alignItems: 'center', gap: 5 }}>
        <span title={ev.reminder_sent ? 'Reminder sent' : hasPhone ? 'Reminder pending' : 'No phone — reminder will not send'}
          style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
            background: ev.reminder_sent ? '#22c55e' : hasPhone ? '#f59e0b' : '#cbd5e1' }} />
        {new Date(ev.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} {ev.title}
        {ev.is_manual && ev.recurring_group_id && <span title="Recurring" style={{ marginLeft: 3, fontSize: 9, opacity: 0.6 }}>REC</span>}
      </div>
      {ev.is_manual && (
        <div style={{ position: 'absolute', top: 3, right: 3, display: 'flex', gap: 2 }}>
          <button onClick={e => { e.stopPropagation(); openEdit(ev) }} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#94a3b8', padding: '1px 3px', lineHeight: 1 }}>Edit</button>
          <button onClick={e => { e.stopPropagation(); requestDelete(ev) }} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#94a3b8', padding: '1px 3px', lineHeight: 1 }}>X</button>
        </div>
      )}

      <div onClick={() => setEditingPhones({ id: ev.id, phones: currentPhones.length ? [...currentPhones] : [''] })}
        style={{ fontSize: 10, color: hasPhone ? green : '#94a3b8', marginTop: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
        {hasPhone ? currentPhones.join(', ') : 'Add phone'}
      </div>

      {editingTemplate === ev.id ? (
        <div style={{ marginTop: 4, padding: '4px 6px', background: '#fff', border: `1px solid ${purple}`, borderRadius: 5 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: purple, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Select templates:</div>
          {templates.map(t => {
            const checked = pendingTemplateIds.includes(Number(t.id))
            const toggle = () => {
              const next = checked
                ? pendingTemplateIds.filter(id => id !== Number(t.id))
                : [...pendingTemplateIds, Number(t.id)]
              if (next.length === 0) return
              setPendingTemplateIds(next)
            }
            return (
              <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: text, cursor: 'pointer', marginBottom: 2 }}>
                <input type="checkbox" checked={checked} onChange={toggle}
                  style={{ accentColor: purple, width: 11, height: 11, cursor: 'pointer' }} />
                {t.name}
              </label>
            )
          })}
          <button onClick={e => { e.stopPropagation(); commitTemplates(ev.id, pendingTemplateIds) }} style={{ marginTop: 4, background: purple, color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
        </div>
      ) : (
        <div onClick={() => { setEditingTemplate(ev.id); setPendingTemplateIds((activeIds).map(Number)) }}
          style={{ fontSize: 9, color: purple, marginTop: 2, fontWeight: 600, opacity: 0.75, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
          title="Click to change templates">
          {activeTemplates.length ? activeTemplates.map(t => t.name).join(', ') : 'Template 1'} v
        </div>
      )}
    </div>
  )
  }

  function renderListCard(ev) {
    const activeIds = (ev.template_ids?.length ? ev.template_ids : [ev.template_id || 1]).map(Number)
    const activeTemplates = templates.filter(t => activeIds.includes(Number(t.id)))
    const currentPhones = getEventPhones(ev)
    const hasPhone = currentPhones.length > 0
    const timeStr = new Date(ev.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return (
      <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 10, padding: '12px 14px', borderLeft: `4px solid ${ev.is_manual ? pink : purple}`, display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative' }}>
        <div style={{ minWidth: 50, textAlign: 'center', paddingTop: 2, flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: purple }}>{timeStr}</div>
        </div>
        <div style={{ width: 1, background: border, alignSelf: 'stretch', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
            <span title={ev.reminder_sent ? 'Reminder sent' : hasPhone ? 'Reminder pending' : 'No phone — reminder will not send'}
              style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, display: 'inline-block', background: ev.reminder_sent ? '#22c55e' : hasPhone ? '#f59e0b' : '#cbd5e1' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: text }}>{ev.title}</span>
            {ev.is_manual && ev.recurring_group_id && <span style={{ fontSize: 9, opacity: 0.6, color: muted }}>REC</span>}
          </div>
          <div onClick={() => setEditingPhones({ id: ev.id, phones: currentPhones.length ? [...currentPhones] : [''] })}
            style={{ fontSize: 12, color: hasPhone ? green : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            {hasPhone ? currentPhones.join(', ') : '+ Add phone'}
          </div>
          {editingTemplate === ev.id ? (
            <div style={{ marginTop: 6, padding: '4px 8px', background: '#fdf4ff', border: `1px solid ${border}`, borderRadius: 5 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: purple, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Select templates:</div>
              {templates.map(t => {
                const checked = pendingTemplateIds.includes(Number(t.id))
                const toggle = () => { const next = checked ? pendingTemplateIds.filter(id => id !== Number(t.id)) : [...pendingTemplateIds, Number(t.id)]; if (next.length === 0) return; setPendingTemplateIds(next) }
                return (
                  <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: text, cursor: 'pointer', marginBottom: 2 }}>
                    <input type="checkbox" checked={checked} onChange={toggle} style={{ accentColor: purple, width: 11, height: 11, cursor: 'pointer' }} />
                    {t.name}
                  </label>
                )
              })}
              <button onClick={e => { e.stopPropagation(); commitTemplates(ev.id, pendingTemplateIds) }}
                style={{ marginTop: 4, background: purple, color: '#fff', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
            </div>
          ) : (
            <div onClick={() => { setEditingTemplate(ev.id); setPendingTemplateIds((activeIds).map(Number)) }}
              style={{ fontSize: 10, color: purple, marginTop: 4, fontWeight: 600, opacity: 0.75, cursor: 'pointer' }}>
              {activeTemplates.length ? activeTemplates.map(t => t.name).join(', ') : 'Template 1'} v
            </div>
          )}
        </div>
        {ev.is_manual && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); openEdit(ev) }}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '4px 9px', fontSize: 11, color: muted, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
            <button onClick={e => { e.stopPropagation(); requestDelete(ev) }}
              style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: '4px 9px', fontSize: 11, color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}>X</button>
          </div>
        )}
      </div>
    )
  }

  const PLAN_LIMITS = { trial:20, starter:100, professional:200, business:400, enterprise:2000 }
  const PLAN_LABELS = { trial:'Free Trial', starter:'Starter', professional:'Professional', business:'Business', enterprise:'Enterprise' }
  const plan       = profile?.plan ?? 'trial'
  const planLimit  = PLAN_LIMITS[plan] ?? 20
  const planLabel  = PLAN_LABELS[plan] ?? 'Free Trial'
  const smsUsed    = sentThisMonth
  const smsLeft    = Math.max(0, planLimit - smsUsed)
  const usedPct    = Math.min(100, Math.round((smsUsed / planLimit) * 100))
  const barColor   = usedPct >= 90 ? '#ef4444' : usedPct >= 70 ? '#f59e0b' : '#a855f7'
  const renewsOn   = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
  const renewsStr  = renewsOn.toLocaleDateString('en-GB', { day:'numeric', month:'short' })

  return (
    <div>
      {/* SMS Allowance bar */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:160 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>SMS this month</span>
            <span style={{ fontSize:12, color:'#94a3b8' }}>{planLabel} · resets {renewsStr}</span>
          </div>
          <div style={{ height:8, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${usedPct}%`, background:barColor, borderRadius:99, transition:'width 0.4s' }} />
          </div>
        </div>
        <div style={{ display:'flex', gap:16, flexShrink:0 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:800, color:'#0f172a', lineHeight:1 }}>{smsUsed}</div>
            <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>sent</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:800, color: smsLeft === 0 ? '#ef4444' : '#a855f7', lineHeight:1 }}>{smsLeft}</div>
            <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>remaining</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:800, color:'#0f172a', lineHeight:1 }}>{planLimit}</div>
            <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>allowance</div>
          </div>
        </div>
        {smsLeft === 0 && (
          <Link to="/settings" style={{ background:'linear-gradient(135deg,#ec4899,#a855f7)', color:'#fff', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>Upgrade</Link>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(22px,3.5vw,32px)', fontWeight: 800, color: text, marginBottom: 4, letterSpacing: '-0.6px' }}>Upcoming Appointments</h1>
          <div style={{ fontSize: 13, color: muted, display: 'flex', alignItems: 'center', gap: 8 }}>
            {(profile?.calendar_provider || profile?.google_calendar_connected || profile?.google_access_token || events.some(e => !e.is_manual)) ? (
              <><span style={{ width: 6, height: 6, borderRadius: '50%', background: green, display: 'inline-block' }} /> Synced from {profile?.calendar_provider || 'Google'} calendar</>
            ) : (
              <><span style={{ color: '#f59e0b' }}>!</span> No calendar connected — <Link to="/settings" style={{ color: purple, fontWeight: 600 }}>connect in Settings</Link></>
            )}
            {(profile?.calendar_provider || profile?.google_calendar_connected || profile?.google_access_token || events.some(e => !e.is_manual)) && (
              <>
                {lastSyncedText(events) && <span style={{ fontSize: 11, color: muted }}>Last synced {lastSyncedText(events)}</span>}
                <span style={{ fontSize: 11, color: muted }}>Syncs every 10 minutes</span>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setShowAddModal(true)} style={{ background: `linear-gradient(135deg,${pink},${purple})`, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            + Add Appointment
          </button>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: 8, padding: 3, gap: 2 }}>
            {[['calendar', 'Calendar'], ['list', 'List']].map(([mode, label]) => (
              <button key={mode} onClick={() => { setViewMode(mode); setEditingTemplate(null); localStorage.setItem('tr_viewMode', mode); }}
                style={{ background: viewMode === mode ? '#fff' : 'transparent', color: viewMode === mode ? purple : muted, border: 'none', borderRadius: 6, padding: '5px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>
          {isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setDayOffset(p => p - 1)} style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: text, fontFamily: 'inherit' }}>Prev</button>
              <div style={{ textAlign: 'center', minWidth: 120 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: singleDay.toDateString() === todayStr ? purple : text }}>
                  {singleDay.toDateString() === todayStr ? 'Today' : singleDay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                </div>
              </div>
              <button onClick={() => setDayOffset(0)} style={{ background: dayOffset === 0 ? '#f3e8ff' : '#fff', border: `1px solid ${dayOffset === 0 ? purple : border}`, borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: dayOffset === 0 ? purple : text, fontFamily: 'inherit' }}>Today</button>
              <button onClick={() => setDayOffset(p => p + 1)} style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: text, fontFamily: 'inherit' }}>Next</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setWeekOffset(p => p - 1)} style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: text, fontFamily: 'inherit' }}>Prev</button>
              <button onClick={() => setWeekOffset(0)} style={{ background: weekOffset === 0 ? '#f3e8ff' : '#fff', border: `1px solid ${weekOffset === 0 ? purple : border}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: weekOffset === 0 ? purple : text, fontFamily: 'inherit' }}>This Week</button>
              <button onClick={() => setWeekOffset(p => p + 1)} style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: text, fontFamily: 'inherit' }}>Next</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, padding: '7px 12px', background: '#f8fafc', border: `1px solid ${border}`, borderRadius: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reminder status:</span>
        {[
          { color: '#22c55e', label: 'Sent' },
          { color: '#f59e0b', label: 'Pending' },
          { color: '#cbd5e1', label: 'No phone' },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: text }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: muted }}>Loading...</div>
      ) : viewMode === 'list' ? (
        <div>
          {(isMobile ? [singleDay] : weekDays).map((day, i) => {
            const dayEvents = getEventsForDay(day)
            const isToday = day.toDateString() === todayStr
            if (!isMobile && dayEvents.length === 0) return null
            return (
              <div key={i} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: isToday ? purple : text, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                    {day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </div>
                  {isToday && <span style={{ fontSize: 10, background: purple, color: '#fff', borderRadius: 20, padding: '2px 8px', fontWeight: 700, flexShrink: 0 }}>Today</span>}
                  {dayEvents.length > 0 && <span style={{ fontSize: 11, color: muted, flexShrink: 0 }}>{dayEvents.length} appointment{dayEvents.length !== 1 ? 's' : ''}</span>}
                  <div style={{ flex: 1, height: 1, background: border }} />
                </div>
                {dayEvents.length === 0 ? (
                  <div style={{ color: '#cbd5e1', fontSize: 13 }}>No appointments</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dayEvents.map(ev => <div key={ev.id}>{renderListCard(ev)}</div>)}
                  </div>
                )}
              </div>
            )
          })}
          {!isMobile && weekDays.every(d => getEventsForDay(d).length === 0) && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: muted, fontSize: 13 }}>No appointments this week</div>
          )}
        </div>
      ) : isMobile ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
          <div ref={calendarRef} style={{ overflowY: 'auto', maxHeight: '70vh' }}>
            {hours.map(hour => {
              const slotEvents = getEventsForSlot(singleDay, hour)
              if (slotEvents.length === 0) return (
                <div key={hour} style={{ display: 'flex', borderBottom: '1px solid #f8fafc', minHeight: 44 }}>
                  <div style={{ width: 56, padding: '10px 8px 0', fontSize: 11, color: '#94a3b8', fontWeight: 600, borderRight: '1px solid #f1f5f9', flexShrink: 0 }}>{hour.toString().padStart(2, '0')}:00</div>
                  <div style={{ flex: 1 }} />
                </div>
              )
              return (
                <div key={hour} style={{ display: 'flex', borderBottom: '1px solid #f8fafc' }}>
                  <div style={{ width: 56, padding: '10px 8px 0', fontSize: 11, color: '#94a3b8', fontWeight: 600, borderRight: '1px solid #f1f5f9', flexShrink: 0 }}>{hour.toString().padStart(2, '0')}:00</div>
                  <div style={{ flex: 1, padding: '4px 8px' }}>{slotEvents.map(ev => <div key={ev.id}>{renderAppointmentBlock(ev)}</div>)}</div>
                </div>
              )
            })}
            {getEventsForDay(singleDay).length === 0 && <div style={{ padding: '40px 20px', textAlign: 'center', color: muted, fontSize: 13 }}>No appointments today</div>}
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
          <div ref={calendarRef} style={{ overflowY: 'auto', maxHeight: '70vh' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7,1fr)', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
              <div style={{ padding: '10px 8px' }} />
              {weekDays.map((day, i) => {
                const isToday = day.toDateString() === todayStr
                return (
                  <div key={i} style={{ padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid #f1f5f9', background: isToday ? '#fdf4ff' : '#fff' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? purple : muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{day.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: isToday ? purple : text, marginTop: 2 }}>{day.getDate()}</div>
                    <div style={{ fontSize: 10, color: muted }}>{day.toLocaleDateString('en-GB', { month: 'short' })}</div>
                  </div>
                )
              })}
            </div>
            {hours.map(hour => (
              <div key={hour} style={{ display: 'grid', gridTemplateColumns: '60px repeat(7,1fr)', borderBottom: '1px solid #f8fafc', minHeight: 56 }}>
                <div style={{ padding: '8px 8px 0', fontSize: 11, color: '#94a3b8', fontWeight: 600, borderRight: '1px solid #f1f5f9' }}>{hour.toString().padStart(2, '0')}:00</div>
                {weekDays.map((day, di) => {
                  const slotEvents = getEventsForSlot(day, hour)
                  const isToday = day.toDateString() === todayStr
                  return (
                    <div key={di} style={{ borderLeft: '1px solid #f1f5f9', padding: '3px 4px', background: isToday ? '#fefcff' : '#fff', minHeight: 56 }}>
                      {slotEvents.map(ev => <div key={ev.id}>{renderAppointmentBlock(ev)}</div>)}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: text, margin: 0 }}>Add Appointment</h2>
              <button onClick={() => { setShowAddModal(false); setAddError('') }} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: muted, padding: 0 }}>X</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text, marginBottom: 5 }}>Customer / title</label>
              <input value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. John Smith - window clean" style={inputStyle} autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text, marginBottom: 5 }}>Date</label>
                <input type="date" value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text, marginBottom: 5 }}>Time</label>
                <input type="time" value={addForm.time} onChange={e => setAddForm(f => ({ ...f, time: e.target.value }))} style={{ ...inputStyle, appearance: 'auto', WebkitAppearance: 'auto' }} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text, marginBottom: 5 }}>Phone number(s) <span style={{ fontWeight: 400, color: muted }}>(optional)</span></label>
              <PhonesInput phones={addForm.phones} onChange={phones => setAddForm(f => ({ ...f, phones }))} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text, marginBottom: 5 }}>Message template</label>
              <select value={addForm.templateId} onChange={e => setAddForm(f => ({ ...f, templateId: parseInt(e.target.value) }))} style={inputStyle}>
                {templates.map(tpl => <option key={tpl.id} value={tpl.id}>{tpl.id}. {tpl.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: text }}>
                <input type="checkbox" checked={addForm.recurring} onChange={e => setAddForm(f => ({ ...f, recurring: e.target.checked }))} style={{ width: 16, height: 16, accentColor: purple, cursor: 'pointer' }} />
                Recurring appointment
              </label>
            </div>
            {addForm.recurring && (
              <div style={{ background: '#fdf4ff', border: `1px solid ${border}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text, marginBottom: 5 }}>Repeat every</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" min={1} max={52} value={addForm.intervalNum} onChange={e => setAddForm(f => ({ ...f, intervalNum: Math.max(1, parseInt(e.target.value) || 1) }))} style={{ ...inputStyle, width: 64 }} />
                    <select value={addForm.intervalUnit} onChange={e => setAddForm(f => ({ ...f, intervalUnit: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>
                      <option value="days">days</option>
                      <option value="weeks">weeks</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text, marginBottom: 8 }}>End</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: text }}>
                      <input type="radio" name="addEndType" value="date" checked={addForm.endType === 'date'} onChange={() => setAddForm(f => ({ ...f, endType: 'date' }))} style={{ accentColor: purple }} />
                      On date
                      {addForm.endType === 'date' && <input type="date" value={addForm.endDate} onChange={e => setAddForm(f => ({ ...f, endDate: e.target.value }))} style={{ ...inputStyle, flex: 1, marginLeft: 4, appearance: 'auto', WebkitAppearance: 'auto' }} />}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: text }}>
                      <input type="radio" name="addEndType" value="indefinite" checked={addForm.endType === 'indefinite'} onChange={() => setAddForm(f => ({ ...f, endType: 'indefinite', endDate: '' }))} style={{ accentColor: purple }} />
                      Until cancelled <span style={{ fontSize: 11, color: muted }}>(creates next 60 days)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
            {addError && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 14 }}>{addError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowAddModal(false); setAddError('') }} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={saveManualAppointment} disabled={savingAdd} style={{ background: savingAdd ? '#e9d5ff' : `linear-gradient(135deg,${pink},${purple})`, color: savingAdd ? purple : '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: savingAdd ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                {savingAdd ? 'Saving...' : 'Save Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div onClick={e => { if (e.target === e.currentTarget) setEditTarget(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: text, margin: 0 }}>Edit Appointment</h2>
              <button onClick={() => setEditTarget(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: muted, padding: 0 }}>X</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text, marginBottom: 5 }}>Customer / title</label>
              <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text, marginBottom: 5 }}>Date</label>
                <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text, marginBottom: 5 }}>Time</label>
                <input type="time" value={editForm.time} onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))} style={{ ...inputStyle, appearance: 'auto', WebkitAppearance: 'auto' }} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text, marginBottom: 5 }}>Phone number(s) <span style={{ fontWeight: 400, color: muted }}>(optional)</span></label>
              <PhonesInput phones={editForm.phones} onChange={phones => setEditForm(f => ({ ...f, phones }))} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text, marginBottom: 5 }}>Message template</label>
              <select value={editForm.templateId} onChange={e => setEditForm(f => ({ ...f, templateId: parseInt(e.target.value) }))} style={inputStyle}>
                {templates.map(tpl => <option key={tpl.id} value={tpl.id}>{tpl.id}. {tpl.name}</option>)}
              </select>
            </div>
            {editTarget.recurring_group_id && (
              <div style={{ background: '#fdf4ff', border: `1px solid ${border}`, borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: purple, marginBottom: 10 }}>Recurring series</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text, marginBottom: 7 }}>Apply changes to</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[['one','Just this occurrence'],['future','This and all future'],['all','All in series']].map(([val, label]) => (
                      <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: text }}>
                        <input type="radio" name="editScope" value={val} checked={editForm.scope === val} onChange={() => setEditForm(f => ({ ...f, scope: val }))} style={{ accentColor: purple }} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                {editForm.scope !== 'one' && (
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: text, marginBottom: editForm.changeFreq ? 10 : 0 }}>
                      <input type="checkbox" checked={editForm.changeFreq} onChange={e => setEditForm(f => ({ ...f, changeFreq: e.target.checked }))} style={{ width: 15, height: 15, accentColor: purple, cursor: 'pointer' }} />
                      Change frequency / end date
                    </label>
                    {editForm.changeFreq && (
                      <div style={{ marginTop: 10 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text, marginBottom: 5 }}>Repeat every</label>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                          <input type="number" min={1} max={52} value={editForm.intervalNum} onChange={e => setEditForm(f => ({ ...f, intervalNum: Math.max(1, parseInt(e.target.value) || 1) }))} style={{ ...inputStyle, width: 64 }} />
                          <select value={editForm.intervalUnit} onChange={e => setEditForm(f => ({ ...f, intervalUnit: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>
                            <option value="days">days</option>
                            <option value="weeks">weeks</option>
                          </select>
                        </div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: text, marginBottom: 8 }}>End</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: text }}>
                            <input type="radio" name="editEndType" value="date" checked={editForm.endType === 'date'} onChange={() => setEditForm(f => ({ ...f, endType: 'date' }))} style={{ accentColor: purple }} />
                            On date
                            {editForm.endType === 'date' && <input type="date" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} style={{ ...inputStyle, flex: 1, marginLeft: 4 }} />}
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: text }}>
                            <input type="radio" name="editEndType" value="indefinite" checked={editForm.endType === 'indefinite'} onChange={() => setEditForm(f => ({ ...f, endType: 'indefinite', endDate: '' }))} style={{ accentColor: purple }} />
                            Until cancelled <span style={{ fontSize: 11, color: muted }}>(next 60 days)</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${border}` }}>
                  <button onClick={() => stopRecurringAfterThis(editTarget)} style={{ background: 'none', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 7, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
                    Stop recurring after this appointment
                  </button>
                </div>
              </div>
            )}
            {editError && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 14 }}>{editError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditTarget(null)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={saveEdit} disabled={savingEdit} style={{ background: savingEdit ? '#e9d5ff' : `linear-gradient(135deg,${pink},${purple})`, color: savingEdit ? purple : '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: savingEdit ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPhones && (
        <PhoneEditModal
          initialPhones={editingPhones.phones}
          onClose={() => setEditingPhones(null)}
          onSave={phones => savePhones(editingPhones.id, phones)}
        />
      )}

      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 16px 50px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 8 }}>Delete recurring appointment?</div>
            <div style={{ fontSize: 13, color: muted, marginBottom: 20 }}><strong style={{ color: text }}>{deleteTarget.title}</strong> is part of a recurring series.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => deleteManualEvent(deleteTarget, 'one')} style={{ background: '#f1f5f9', color: text, border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>Delete just this occurrence</button>
              <button onClick={() => deleteManualEvent(deleteTarget, 'all')} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>Delete all in this series</button>
              <button onClick={() => setDeleteTarget(null)} style={{ background: 'none', color: muted, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
