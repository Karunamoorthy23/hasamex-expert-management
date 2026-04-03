import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import LocationSelector from '../../components/location/LocationSelector';
import { resolveTimezoneLabel } from '../../components/location/TimezoneResolver';
import './ProjectForm.css';

const STEPS = ['Project Brief', 'Profile Questions', 'Your Details', 'Compliance', 'Declaration'];
const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export default function ProjectForm() {
  const { id } = useParams();
  const query = new URLSearchParams(window.location.search);
  const expert_id = query.get('expert_id');
  const [project, setProject] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [heroText, setHeroText] = useState('Expert Consultation · Application Form');

  // Form state
  const [answers, setAnswers] = useState({ q1: '', q2: '', q3: '' });
  const [confidence, setConfidence] = useState(5);
  const [details, setDetails] = useState({ first_name: '', last_name: '', email: '', phone: '', emp_company: '', emp_role: '', emp_start_year: '', emp_end_year: '', location: '', time_zone: '' });
  const [slots, setSlots] = useState([{ date: '', startTime: '', endTime: '' }]);
  const [isLocLoading, setIsLocLoading] = useState(false);
  const [comp, setComp] = useState({ comp1: '', comp2: '' });
  const [declaration, setDeclaration] = useState('');
  const [errors, setErrors] = useState({});

  // Load Google Fonts
  useEffect(() => {
    if (!document.getElementById('pf-google-fonts')) {
      const link = document.createElement('link');
      link.id = 'pf-google-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Fetch project data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${BASE_URL}/public/projects/${id}/form`)
      .then(r => { if (!r.ok) throw new Error('Project not found'); return r.json(); })
      .then(data => {
        const p = data.data || data;
        setProject(p);
        // Using data coming directly from the new public API (which includes client info)
        setClientData({ client_type: p.client_type, client_name: p.client_name });
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [id]);

  const updateSliderBg = useCallback((val) => {
    const pct = (val / 10) * 100;
    return `linear-gradient(to right, #c49e50 0%, #c49e50 ${pct}%, #e8e2d6 ${pct}%, #e8e2d6 100%)`;
  }, []);

  const profileQuestions = [];
  if (project?.profile_question_1) profileQuestions.push(project.profile_question_1);
  if (project?.profile_question_2) profileQuestions.push(project.profile_question_2);
  if (project?.profile_question_3) profileQuestions.push(project.profile_question_3);

  const scopeItems = (project?.target_functions_titles || '')
    .split('\n').map(s => s.trim()).filter(Boolean);

  const receivedDate = project?.received_date ? new Date(project.received_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const deadlineDate = project?.project_deadline ? new Date(project.project_deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const studyPeriod = `${receivedDate} – ${deadlineDate}`;

  const validateStep = (step) => {
    const newErrors = {};
    if (step === 1) {
      profileQuestions.forEach((_, i) => {
        if (!answers[`q${i + 1}`]?.trim()) newErrors[`q${i + 1}`] = 'This field is required.';
      });
    }
    if (step === 2) {
      if (!details.first_name.trim()) newErrors.first_name = 'First name is required.';
      if (!details.last_name.trim()) newErrors.last_name = 'Last name is required.';
      if (!details.email.trim()) newErrors.email = 'A valid email is required.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) newErrors.email = 'A valid email is required.';
      if (!details.phone.trim()) newErrors.phone = 'Phone number is required.';
      else if (!/^[+\d\s()-]{7,20}$/.test(details.phone)) newErrors.phone = 'Enter a valid phone number.';
      if (!details.emp_company.trim()) newErrors.emp_company = 'Company name is required.';
      if (!details.emp_role.trim()) newErrors.emp_role = 'Role / Position is required.';
      if (!details.location?.trim()) newErrors.location = 'Location is required.';
      if (!details.time_zone?.trim()) newErrors.time_zone = 'Time zone is required.';
    }
    if (step === 3) {
      if (!comp.comp1) newErrors.comp1 = 'Please select an answer.';
      if (!comp.comp2) newErrors.comp2 = 'Please select an answer.';
    }
    if (step === 4) {
      if (declaration !== 'yes') newErrors.declaration = 'You must confirm to submit your application.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = async () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Perform Final Submission
      setLoading(true);
      try {
        // Map questions to their actual text for better readability in the dashboard
        const finalQas = {};
        profileQuestions.forEach((q, i) => {
          finalQas[q] = answers[`q${i + 1}`];
        });

        const comp1Text = "Are you permitted to share material non-public information (MNPI) during a Hasamex consultation?";
        const comp1Options = {
          'A': 'Yes, as long as the client agrees to keep it confidential',
          'B': 'Yes, if it is no longer being used by the company',
          'C': 'No, I must never share any confidential or non-public information',
          'D': 'I can share internal information if I no longer work for the company'
        };
        const comp2Text = "During a consultation, a client asks for details about an upcoming product launch at your former company. What should you do?";
        const comp2Options = {
          'A': 'Share only the launch date, not the full strategy',
          'B': 'Answer the question if the product has already been mentioned internally',
          'C': 'Politely decline to answer and explain that it involves non-public information',
          'D': "Share the information if it's not being used to trade stocks"
        };
        const finalComp = {
          [comp1Text]: comp1Options[comp.comp1] || comp.comp1,
          [comp2Text]: comp2Options[comp.comp2] || comp.comp2
        };

        const payload = {
          expert_id,
          details,
          confidence,
          qas: finalQas,
          slots,
          comp: finalComp
        };
        const response = await fetch(`${BASE_URL}/public/projects/${id}/submit-form`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to submit application');
        }
        setSubmitted(true);
        setHeroText('Application Submitted · Thank You');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
      setErrors({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const addSlot = () => setSlots(s => [...s, { date: '', startTime: '', endTime: '' }]);
  const removeSlot = (i) => setSlots(s => s.filter((_, idx) => idx !== i));
  const updateSlot = (i, field, val) => setSlots(s => s.map((sl, idx) => idx === i ? { ...sl, [field]: val } : sl));

  // Render loading/error states
  if (loading) {
    return (
      <div className="pf-page-wrapper">
        <div className="pf-loading">
          <div className="pf-spinner" />
          <div className="pf-loading-text">Loading project form...</div>
        </div>
      </div>
    );
  }
  if (error || !project) {
    return (
      <div className="pf-page-wrapper">
        <div className="pf-error-state">
          <h2>Project Not Found</h2>
          <p>{error || 'The requested project could not be loaded.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-page-wrapper">
      {/* HEADER */}
      <div className="pf-header-card">
        <div className="pf-header-inner">
          <div>
            <div className="pf-logo-name">HASAMEX</div>
            <div className="pf-logo-tagline">Expert Insight · Speed &amp; Trust</div>
          </div>
          <div className="pf-header-badge">
            <span className="pf-badge-label">Document Type</span>
            <span className="pf-badge-value">Expert Application</span>
          </div>
        </div>
      </div>
      <div className="pf-header-divider" />

      <div className="pf-form-card">
        {/* HERO STRIP */}
        <div className="pf-hero-strip">
          <div className="pf-hero-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#c49e50" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="pf-hero-text">{heroText}</div>
        </div>

        {/* PROGRESS STEPS */}
        {!submitted && (
          <div className="pf-progress-bar-wrap">
            <div className="pf-progress-steps">
              {STEPS.map((label, i) => (
                <div className="pf-step-item" key={i}>
                  <div className={`pf-step-dot ${i < currentStep ? 'done' : i === currentStep ? 'active' : ''}`}>
                    {i < currentStep ? '✓' : i + 1}
                  </div>
                  <span className={`pf-step-label ${i < currentStep ? 'done' : i === currentStep ? 'active' : ''}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1 — PROJECT BRIEF */}
        <div className={`pf-form-section ${currentStep === 0 && !submitted ? 'active' : ''}`}>
          <div className="pf-project-title">{project.project_title || project.title || 'Project'}</div>
          <p className="pf-project-subtitle">
            {studyPeriod} · {clientData?.client_type || project.project_type || 'Consultation Study'} · 45–60 Minute Paid Consultation
          </p>

          <div className="pf-section-label">About the Project</div>
          <p className="pf-about-text">{project.project_description || project.description || '—'}</p>

          <div className="pf-section-label">Project Details</div>
          <div className="pf-details-card">
            <div className="pf-detail-grid">
              <div className="pf-detail-item">
                <div className="pf-detail-key">Client Type</div>
                <div className="pf-detail-value">{clientData?.client_type || '—'}</div>
              </div>
              <div className="pf-detail-item">
                <div className="pf-detail-key">Study Period</div>
                <div className="pf-detail-value">{studyPeriod}</div>
              </div>
              <div className="pf-detail-item">
                <div className="pf-detail-key">Geography</div>
                <div className="pf-detail-value">
                  {(project.target_geographies || []).join(', ') || project.target_region || '—'}
                </div>
              </div>
              <div className="pf-detail-item">
                <div className="pf-detail-key">Sector</div>
                <div className="pf-detail-value">{project.sector || clientData?.client_type || '—'}</div>
              </div>
              <div className="pf-detail-item full">
                <div className="pf-detail-key">Call Format &amp; Duration</div>
                <div className="pf-detail-value">45–60 Minute One-on-One · MS Teams or Zoom · Paid Engagement</div>
              </div>
            </div>
          </div>

          {scopeItems.length > 0 && (
            <>
              <div className="pf-section-label">Scope of Discussion</div>
              <ul className="pf-scope-list">
                {scopeItems.map((item, i) => (
                  <li key={i}><span className="pf-scope-bullet" /><span>{item}</span></li>
                ))}
              </ul>
            </>
          )}

          <div className="pf-compliance-box">
            <div className="pf-compliance-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span className="pf-compliance-title">Compliance Disclaimer</span>
            </div>
            <p className="pf-compliance-text">
              This project is conducted in accordance with Hasamex's strict compliance protocols. We do not permit the sharing of confidential, proprietary, or material non-public information (MNPI), nor any information covered under employment, fiduciary, or non-disclosure obligations. Experts must rely solely on personal experience and publicly available information.
            </p>
          </div>
        </div>

        {/* STEP 2 — PROFILE QUESTIONS */}
        <div className={`pf-form-section ${currentStep === 1 && !submitted ? 'active' : ''}`}>
          <div className="pf-section-heading">Profile Questions</div>
          <p className="pf-section-desc">Please answer each question to help us evaluate your fit for this project. Your responses help the client team assess relevance and depth of expertise.</p>

          {profileQuestions.map((q, i) => (
            <div className="pf-field-group" key={i}>
              <label className="pf-field-label">{i + 1}. {q} <span className="required">*</span></label>
              <textarea
                value={answers[`q${i + 1}`] || ''}
                onChange={e => setAnswers(a => ({ ...a, [`q${i + 1}`]: e.target.value }))}
                placeholder="Describe your relevant experience…"
                className={errors[`q${i + 1}`] ? 'invalid' : ''}
              />
              <div className={`pf-field-error ${errors[`q${i + 1}`] ? 'visible' : ''}`}>{errors[`q${i + 1}`]}</div>
            </div>
          ))}

          <div className="pf-field-group">
            <label className="pf-field-label">{profileQuestions.length + 1}. Confidence Level <span className="required">*</span></label>
            <p className="pf-field-hint">On a scale of 1 to 10, how confident are you in speaking about the topics above?</p>
            <div className="pf-slider-wrap">
              <input
                type="range" className="pf-confidence-slider"
                min="0" max="10" value={confidence}
                style={{ background: updateSliderBg(confidence) }}
                onChange={e => setConfidence(Number(e.target.value))}
              />
              <div className="pf-slider-labels">
                <span>0 — Not confident</span>
                <span>10 — Highly confident</span>
              </div>
              <div className="pf-confidence-display">
                <div className="pf-confidence-value">{confidence}</div>
                <div className="pf-confidence-label">Confidence Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 3 — YOUR DETAILS */}
        <div className={`pf-form-section ${currentStep === 2 && !submitted ? 'active' : ''}`}>
          <div className="pf-section-heading">Your Basic Information</div>
          <p className="pf-section-desc">Please provide your core contact details so we can keep your profile up to date and reach out if you're selected for this project.</p>

          <div className="pf-field-row">
            <div className="pf-field-group">
              <label className="pf-field-label">First Name <span className="required">*</span></label>
              <input type="text" value={details.first_name} onChange={e => setDetails(d => ({ ...d, first_name: e.target.value }))} placeholder="e.g. John" className={errors.first_name ? 'invalid' : ''} />
              <div className={`pf-field-error ${errors.first_name ? 'visible' : ''}`}>{errors.first_name}</div>
            </div>
            <div className="pf-field-group">
              <label className="pf-field-label">Last Name <span className="required">*</span></label>
              <input type="text" value={details.last_name} onChange={e => setDetails(d => ({ ...d, last_name: e.target.value }))} placeholder="e.g. Smith" className={errors.last_name ? 'invalid' : ''} />
              <div className={`pf-field-error ${errors.last_name ? 'visible' : ''}`}>{errors.last_name}</div>
            </div>
          </div>

          <div className="pf-field-row">
            <div className="pf-field-group">
              <label className="pf-field-label">Personal Email <span className="required">*</span></label>
              <input type="email" value={details.email} onChange={e => setDetails(d => ({ ...d, email: e.target.value }))} placeholder="e.g. john@email.com" className={errors.email ? 'invalid' : ''} />
              <div className={`pf-field-error ${errors.email ? 'visible' : ''}`}>{errors.email}</div>
            </div>
            <div className="pf-field-group">
              <label className="pf-field-label">Phone Number <span className="required">*</span></label>
              <input type="tel" value={details.phone} onChange={e => setDetails(d => ({ ...d, phone: e.target.value }))} placeholder="e.g. +66 81 234 5678" className={errors.phone ? 'invalid' : ''} />
              <div className={`pf-field-error ${errors.phone ? 'visible' : ''}`}>{errors.phone}</div>
            </div>
          </div>

          <div className="pf-field-row">
            <div className="pf-field-group">
              <label className="pf-field-label">Company Name <span className="required">*</span></label>
              <input type="text" value={details.emp_company} onChange={e => setDetails(d => ({ ...d, emp_company: e.target.value }))} placeholder="e.g. Google" className={errors.emp_company ? 'invalid' : ''} />
              <div className={`pf-field-error ${errors.emp_company ? 'visible' : ''}`}>{errors.emp_company}</div>
            </div>
            <div className="pf-field-group">
              <label className="pf-field-label">Role / Position <span className="required">*</span></label>
              <input type="text" value={details.emp_role} onChange={e => setDetails(d => ({ ...d, emp_role: e.target.value }))} placeholder="e.g. Senior Engineer" className={errors.emp_role ? 'invalid' : ''} />
              <div className={`pf-field-error ${errors.emp_role ? 'visible' : ''}`}>{errors.emp_role}</div>
            </div>
          </div>

          <div className="pf-field-row">
            <div className="pf-field-group">
              <label className="pf-field-label">Start Year</label>
              <input type="number" min="1950" max={new Date().getFullYear() + 10} value={details.emp_start_year} onChange={e => setDetails(d => ({ ...d, emp_start_year: e.target.value }))} placeholder="YYYY" />
            </div>
            <div className="pf-field-group">
              <label className="pf-field-label">End Year</label>
              <input type="number" min="1950" max={new Date().getFullYear() + 10} value={details.emp_end_year} onChange={e => setDetails(d => ({ ...d, emp_end_year: e.target.value }))} placeholder="YYYY (leave blank for Present)" />
            </div>
          </div>

          <div className="pf-field-row">
            <div className="pf-field-group">
              <label className="pf-field-label">Location <span className="required">*</span></label>
              <div className={errors.location ? 'invalid-loc' : ''}>
                  <LocationSelector
                      value={{ display_name: details.location }}
                      onChange={async (sel) => {
                          setIsLocLoading(true);
                          let label = '';
                          try {
                              label = await resolveTimezoneLabel({
                                  timezoneName: sel.timezone,
                                  latitude: sel.latitude,
                                  longitude: sel.longitude,
                              });
                          } catch {
                              label = '';
                          } finally {
                              setIsLocLoading(false);
                          }
                          setDetails((p) => ({
                              ...p,
                              location: sel.display_name,
                              time_zone: label || p.time_zone,
                          }));
                      }}
                  />
              </div>
              {isLocLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, color: '#666', fontSize: 12 }}>
                      <svg width="14" height="14" viewBox="0 0 50 50" aria-hidden="true">
                          <circle cx="25" cy="25" r="20" stroke="#999" strokeWidth="5" fill="none" strokeDasharray="31.415,31.415" strokeLinecap="round">
                              <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.8s" repeatCount="indefinite" />
                          </circle>
                      </svg>
                      <span>Resolving timezone…</span>
                  </div>
              )}
              <div className={`pf-field-error ${errors.location ? 'visible' : ''}`}>{errors.location}</div>
            </div>
            <div className="pf-field-group">
              <label className="pf-field-label">Time Zone <span className="required">*</span></label>
              <input type="text" value={details.time_zone} onChange={e => setDetails(d => ({ ...d, time_zone: e.target.value }))} placeholder="e.g. GMT+7 (Bangkok)" className={errors.time_zone ? 'invalid' : ''} />
              <div className={`pf-field-error ${errors.time_zone ? 'visible' : ''}`}>{errors.time_zone}</div>
            </div>
          </div>

          <div className="pf-field-group" style={{ marginTop: 8 }}>
            <label className="pf-field-label">Your Availability <span className="required">*</span></label>
            <p className="pf-field-hint">Please share your availability for a phone consultation over the next 5 business days.</p>
            {slots.map((slot, i) => (
              <div className="pf-avail-row" key={i}>
                <div style={{ flex: 1 }}>
                  <div className="pf-field-label" style={{ fontSize: 10, marginBottom: 5 }}>Date</div>
                  <input type="date" value={slot.date} onChange={e => updateSlot(i, 'date', e.target.value)} />
                </div>
                <div className="pf-avail-sep">—</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flex: 2 }}>
                  <div style={{ flex: 1 }}>
                    <div className="pf-field-label" style={{ fontSize: 10, marginBottom: 5 }}>Start Time</div>
                    <input type="time" value={slot.startTime} onChange={e => updateSlot(i, 'startTime', e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="pf-field-label" style={{ fontSize: 10, marginBottom: 5 }}>End Time</div>
                    <input type="time" value={slot.endTime} onChange={e => updateSlot(i, 'endTime', e.target.value)} />
                  </div>
                  {i > 0 && <button type="button" className="pf-remove-slot" onClick={() => removeSlot(i)} title="Remove slot">×</button>}
                </div>
              </div>
            ))}
            <button type="button" className="pf-add-slot-btn" onClick={addSlot}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Another Time Slot
            </button>
          </div>
        </div>

        {/* STEP 4 — COMPLIANCE */}
        <div className={`pf-form-section ${currentStep === 3 && !submitted ? 'active' : ''}`}>
          <div className="pf-section-heading">Compliance Onboarding</div>
          <p className="pf-section-desc">Before proceeding, please answer the two questions below to confirm your understanding around confidentiality and your responsibilities.</p>

          <div className="pf-field-group">
            <label className="pf-field-label">1. Sharing Material Non-Public Information (MNPI) <span className="required">*</span></label>
            <p className="pf-field-hint">Are you permitted to share material non-public information (MNPI) during a Hasamex consultation?</p>
            <div className="pf-options-grid">
              {[
                { val: 'A', text: 'Yes, as long as the client agrees to keep it confidential' },
                { val: 'B', text: 'Yes, if it is no longer being used by the company' },
                { val: 'C', text: 'No, I must never share any confidential or non-public information', bold: true },
                { val: 'D', text: 'I can share internal information if I no longer work for the company' },
              ].map(opt => (
                <label className="pf-option-card" key={opt.val}>
                  <input type="radio" name="comp1" value={opt.val} checked={comp.comp1 === opt.val} onChange={() => setComp(c => ({ ...c, comp1: opt.val }))} />
                  <div className="pf-option-label">
                    <span className="pf-option-letter">{opt.val}</span>
                    <span className="pf-option-text">{opt.bold ? <strong>{opt.text}</strong> : opt.text}</span>
                  </div>
                </label>
              ))}
            </div>
            <div className={`pf-field-error ${errors.comp1 ? 'visible' : ''}`}>{errors.comp1}</div>
          </div>

          <div className="pf-field-group" style={{ marginTop: 8 }}>
            <label className="pf-field-label">2. Handling Sensitive Client Requests <span className="required">*</span></label>
            <p className="pf-field-hint">During a consultation, a client asks for details about an upcoming product launch at your former company. What should you do?</p>
            <div className="pf-options-grid">
              {[
                { val: 'A', text: 'Share only the launch date, not the full strategy' },
                { val: 'B', text: 'Answer the question if the product has already been mentioned internally' },
                { val: 'C', text: 'Politely decline to answer and explain that it involves non-public information', bold: true },
                { val: 'D', text: "Share the information if it's not being used to trade stocks" },
              ].map(opt => (
                <label className="pf-option-card" key={opt.val}>
                  <input type="radio" name="comp2" value={opt.val} checked={comp.comp2 === opt.val} onChange={() => setComp(c => ({ ...c, comp2: opt.val }))} />
                  <div className="pf-option-label">
                    <span className="pf-option-letter">{opt.val}</span>
                    <span className="pf-option-text">{opt.bold ? <strong>{opt.text}</strong> : opt.text}</span>
                  </div>
                </label>
              ))}
            </div>
            <div className={`pf-field-error ${errors.comp2 ? 'visible' : ''}`}>{errors.comp2}</div>
          </div>
        </div>

        {/* STEP 5 — DECLARATION */}
        <div className={`pf-form-section ${currentStep === 4 && !submitted ? 'active' : ''}`}>
          <div className="pf-section-heading">Terms of Participation &amp; Declaration</div>
          <p className="pf-section-desc">To complete your onboarding, please review and acknowledge the following terms.</p>

          <div className="pf-terms-block">
            <div className="pf-terms-title">By submitting, you confirm that:</div>
            <ul className="pf-terms-list">
              {[
                'You are participating voluntarily and are not restricted by any contractual, fiduciary, or legal obligations.',
                'The information you have provided is accurate and complete to the best of your knowledge.',
                <>You have read and understood the <a href="https://www.hasamex.com/terms" target="_blank" rel="noreferrer">Hasamex Expert Participation Terms</a> and agree to abide by them.</>,
                <>You consent to Hasamex storing and processing your personal information solely for project evaluation, in accordance with our <a href="https://www.hasamex.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</>,
              ].map((text, i) => (
                <li key={i}>
                  <div className="pf-terms-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pf-field-group">
            <label className="pf-field-label">Confirmation <span className="required">*</span></label>
            <p className="pf-field-hint">Do you confirm that you have read, understood, and agreed to the terms?</p>
            <div className="pf-options-grid cols-2">
              <label className="pf-option-card">
                <input type="radio" name="declaration" value="yes" checked={declaration === 'yes'} onChange={() => setDeclaration('yes')} />
                <div className="pf-option-label" style={{ justifyContent: 'center', textAlign: 'center', flexDirection: 'column', gap: 8, padding: 20 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#1a7a4a" strokeWidth="2.2" width="22" height="22" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span className="pf-option-text"><strong style={{ color: 'var(--pf-navy)' }}>Yes — I confirm and agree</strong></span>
                </div>
              </label>
              <label className="pf-option-card">
                <input type="radio" name="declaration" value="no" checked={declaration === 'no'} onChange={() => setDeclaration('no')} />
                <div className="pf-option-label" style={{ justifyContent: 'center', textAlign: 'center', flexDirection: 'column', gap: 8, padding: 20 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2.2" width="22" height="22" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  <span className="pf-option-text"><strong style={{ color: 'var(--pf-text-mid)' }}>No — I do not</strong></span>
                </div>
              </label>
            </div>
            <div className={`pf-field-error ${errors.declaration ? 'visible' : ''}`}>{errors.declaration}</div>
          </div>
        </div>

        {/* SUCCESS SCREEN */}
        <div className={`pf-success-screen ${submitted ? 'visible' : ''}`}>
          <div className="pf-success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#e8c96d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div className="pf-success-title">Application Submitted</div>
          <p className="pf-success-text">Thank you for expressing your interest. Our team at Hasamex will review your profile and reach out within 1–2 business days if your background is a strong match for this project.</p>
          <div className="pf-success-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Review typically within 1–2 business days
          </div>
        </div>

        {/* NAVIGATION */}
        {!submitted && (
          <div className="pf-form-nav">
            <button className="pf-btn-back" onClick={prevStep} style={{ visibility: currentStep === 0 ? 'hidden' : 'visible' }}>← Back</button>
            <span className="pf-step-counter">Step {currentStep + 1} of {STEPS.length}</span>
            {currentStep === STEPS.length - 1 ? (
              <button className="pf-btn-submit" onClick={nextStep}>
                Submit Application
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
            ) : (
              <button className="pf-btn-next" onClick={nextStep}>
                Continue
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="pf-footer">
        <div className="pf-footer-inner">
          <div className="pf-footer-brand">HASA<span>MEX</span></div>
          <div className="pf-footer-links">
            <a href="https://www.hasamex.com/" target="_blank" rel="noreferrer">Website</a>
            <a href="mailto:contact@hasamex.com">Contact</a>
            <a href="#">Privacy Policy</a>
          </div>
        </div>
        <div className="pf-footer-divider" />
        <div className="pf-footer-copy">© 2026 Hasamex · Expert Insight Delivered with Speed &amp; Trust · Confidential Communication</div>
      </div>
    </div>
  );
}
