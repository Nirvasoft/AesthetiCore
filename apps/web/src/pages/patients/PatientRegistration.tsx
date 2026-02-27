import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box, Typography, Button, TextField, Grid, Paper, Stack, Divider,
    Alert, AlertTitle, Chip, CircularProgress, Stepper, Step, StepLabel,
    MenuItem, Select, FormControl, InputLabel, FormHelperText,
} from '@mui/material';
import {
    PersonAdd, Warning, ArrowBack, ArrowForward, CheckCircle,
} from '@mui/icons-material';
import { patientsApi, type Patient } from '../../lib/patients-api';

interface FormData {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    gender: string;
    dateOfBirth: string;
    lineId: string;
    notes: string;
}

const INITIAL: FormData = {
    firstName: '', lastName: '', phone: '', email: '',
    gender: '', dateOfBirth: '', lineId: '', notes: '',
};

const steps = ['Basic Info', 'Contact & Details', 'Review & Consent'];

export function PatientRegistrationPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<FormData>(INITIAL);
    const [errors, setErrors] = useState<Partial<FormData>>({});
    const [duplicates, setDuplicates] = useState<Patient[]>([]);
    const [duplicateChecked, setDuplicateChecked] = useState(false);
    const [consentGiven, setConsentGiven] = useState(false);

    const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((f) => ({ ...f, [field]: e.target.value }));
        setErrors((e2) => ({ ...e2, [field]: '' }));
    };

    // ── Duplicate check ─────────────────────────────────────────────────────
    const { refetch: checkDups, isFetching: checkingDups } = useQuery({
        queryKey: ['dup-check', form.phone, form.firstName, form.lastName],
        queryFn: () => patientsApi.checkDuplicates(form.phone, form.firstName, form.lastName),
        enabled: false,
    });

    const handleDuplicateCheck = async () => {
        const { data } = await checkDups();
        setDuplicates(data ?? []);
        setDuplicateChecked(true);
    };

    // ── Create mutation ─────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: () =>
            patientsApi.create({
                firstName: form.firstName,
                lastName: form.lastName,
                phone: form.phone,
                email: form.email || undefined,
                gender: form.gender || undefined,
                dateOfBirth: form.dateOfBirth || undefined,
                lineId: form.lineId || undefined,
                notes: form.notes || undefined,
            }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['patients'] });
            if (data.patient) {
                navigate(`/patients/${data.patient.id}`);
            }
        },
    });

    // ── Validation ──────────────────────────────────────────────────────────
    const validateStep = (s: number): boolean => {
        const errs: Partial<FormData> = {};
        if (s === 0) {
            if (!form.firstName.trim()) errs.firstName = 'First name is required';
            if (!form.lastName.trim()) errs.lastName = 'Last name is required';
            if (!form.phone.trim()) errs.phone = 'Phone number is required';
            if (form.phone && !/^[+0-9\s\-]{7,}$/.test(form.phone))
                errs.phone = 'Enter a valid phone number';
        }
        if (s === 1) {
            if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                errs.email = 'Enter a valid email';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleNext = async () => {
        if (!validateStep(step)) return;
        if (step === 0 && !duplicateChecked) {
            await handleDuplicateCheck();
            return;
        }
        setStep((s) => s + 1);
    };

    const handleSubmit = () => {
        if (!consentGiven) return;
        createMutation.mutate();
    };

    return (
        <Box sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" gap={2} mb={4}>
                <Button
                    id="btn-back-patients"
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/patients')}
                    variant="text"
                    color="inherit"
                >
                    Patients
                </Button>
                <Typography variant="h6" fontWeight={700} flex={1}>
                    Register New Patient
                </Typography>
            </Stack>

            {/* Stepper */}
            <Stepper activeStep={step} sx={{ mb: 4 }}>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {/* ── Step 0: Basic Info ── */}
            {step === 0 && (
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} mb={2}>
                        Basic Information
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                id="field-firstName"
                                label="First Name *"
                                fullWidth
                                value={form.firstName}
                                onChange={set('firstName')}
                                error={!!errors.firstName}
                                helperText={errors.firstName}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                id="field-lastName"
                                label="Last Name *"
                                fullWidth
                                value={form.lastName}
                                onChange={set('lastName')}
                                error={!!errors.lastName}
                                helperText={errors.lastName}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                id="field-phone"
                                label="Phone Number *"
                                fullWidth
                                value={form.phone}
                                onChange={set('phone')}
                                error={!!errors.phone}
                                helperText={errors.phone ?? 'Used for duplicate detection'}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel id="gender-label">Gender</InputLabel>
                                <Select
                                    id="field-gender"
                                    labelId="gender-label"
                                    label="Gender"
                                    value={form.gender}
                                    onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                                >
                                    <MenuItem value="">Prefer not to say</MenuItem>
                                    <MenuItem value="female">Female</MenuItem>
                                    <MenuItem value="male">Male</MenuItem>
                                    <MenuItem value="other">Other</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                id="field-dob"
                                label="Date of Birth"
                                type="date"
                                fullWidth
                                value={form.dateOfBirth}
                                onChange={set('dateOfBirth')}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>

                    {/* Duplicate warning */}
                    {duplicateChecked && duplicates.length > 0 && (
                        <Alert severity="warning" icon={<Warning />} sx={{ mt: 2 }}>
                            <AlertTitle>Possible Duplicate Patients Found</AlertTitle>
                            {duplicates.map((d) => (
                                <Stack
                                    key={d.id}
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    sx={{ mt: 0.5 }}
                                >
                                    <Typography variant="body2">
                                        <strong>{d.firstName} {d.lastName}</strong> — {d.phone} ({d.branch?.name})
                                    </Typography>
                                    <Button
                                        size="small"
                                        onClick={() => navigate(`/patients/${d.id}`)}
                                    >
                                        View
                                    </Button>
                                </Stack>
                            ))}
                            <Button
                                variant="outlined"
                                size="small"
                                sx={{ mt: 1 }}
                                onClick={() => { setDuplicates([]); setStep(1); }}
                            >
                                Continue Anyway (New Patient)
                            </Button>
                        </Alert>
                    )}

                    {duplicateChecked && duplicates.length === 0 && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                            No duplicates found — safe to proceed.
                        </Alert>
                    )}
                </Paper>
            )}

            {/* ── Step 1: Contact & Details ── */}
            {step === 1 && (
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} mb={2}>
                        Contact & Additional Details
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                id="field-email"
                                label="Email Address"
                                type="email"
                                fullWidth
                                value={form.email}
                                onChange={set('email')}
                                error={!!errors.email}
                                helperText={errors.email}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                id="field-lineId"
                                label="LINE ID"
                                fullWidth
                                value={form.lineId}
                                onChange={set('lineId')}
                                helperText="For CRM messaging"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                id="field-notes"
                                label="Internal Notes"
                                fullWidth
                                multiline
                                rows={3}
                                value={form.notes}
                                onChange={set('notes')}
                                helperText="Not visible to patient"
                            />
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {/* ── Step 2: Review & Consent ── */}
            {step === 2 && (
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} mb={2}>
                        Review & PDPA Consent
                    </Typography>

                    {/* Summary */}
                    <Stack gap={1} mb={3}>
                        {[
                            { label: 'Name', value: `${form.firstName} ${form.lastName}` },
                            { label: 'Phone', value: form.phone },
                            { label: 'Email', value: form.email || '—' },
                            { label: 'Gender', value: form.gender || '—' },
                            { label: 'Date of Birth', value: form.dateOfBirth || '—' },
                            { label: 'LINE ID', value: form.lineId || '—' },
                        ].map(({ label, value }) => (
                            <Stack key={label} direction="row" divider={<Divider orientation="vertical" flexItem />} gap={2}>
                                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                                    {label}
                                </Typography>
                                <Typography variant="body2" fontWeight={500}>{value}</Typography>
                            </Stack>
                        ))}
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    {/* Consent */}
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <AlertTitle>PDPA Data Processing Consent</AlertTitle>
                        This clinic collects and processes your personal information and medical data
                        to provide healthcare services. By proceeding, you consent to data processing
                        as outlined in our Privacy Policy.
                    </Alert>

                    <Button
                        id="btn-consent-toggle"
                        variant={consentGiven ? 'contained' : 'outlined'}
                        color={consentGiven ? 'success' : 'primary'}
                        startIcon={consentGiven ? <CheckCircle /> : null}
                        onClick={() => setConsentGiven((v) => !v)}
                        sx={{ mb: 2 }}
                    >
                        {consentGiven ? 'Consent Given ✓' : 'Patient Gives Consent'}
                    </Button>

                    {createMutation.isError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            Registration failed. Please try again.
                        </Alert>
                    )}

                    {createMutation.data?.isDuplicate && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            A duplicate was detected. Check existing patients before registering again.
                        </Alert>
                    )}
                </Paper>
            )}

            {/* Navigation */}
            <Stack direction="row" justifyContent="space-between" mt={3}>
                <Button
                    id="btn-step-back"
                    variant="outlined"
                    onClick={() => step > 0 ? setStep((s) => s - 1) : navigate('/patients')}
                    startIcon={<ArrowBack />}
                >
                    {step === 0 ? 'Cancel' : 'Back'}
                </Button>

                {step < 2 ? (
                    <Button
                        id="btn-step-next"
                        variant="contained"
                        onClick={handleNext}
                        endIcon={checkingDups ? <CircularProgress size={16} color="inherit" /> : <ArrowForward />}
                        disabled={checkingDups}
                    >
                        {step === 0 && !duplicateChecked ? 'Check & Continue' : 'Next'}
                    </Button>
                ) : (
                    <Button
                        id="btn-register-submit"
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!consentGiven || createMutation.isPending}
                        startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <PersonAdd />}
                    >
                        {createMutation.isPending ? 'Registering…' : 'Register Patient'}
                    </Button>
                )}
            </Stack>
        </Box>
    );
}
