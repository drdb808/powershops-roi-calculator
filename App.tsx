
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { ArrowLeft, ArrowRight, BrainCircuit, Download, Users, TrendingUp, FileText, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- ASSETS ---
// The image logo has been removed to fix persistent PDF generation errors.
// It is replaced with a styled text component for reliability.
const Logo = ({ className }: { className?: string }) => (
    <div className={`font-bold text-4xl text-brand-carmine ${className}`}>
        Create One
    </div>
);


// --- HELPER & UI COMPONENTS ---

const ExecutiveSummaryCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-white rounded-lg p-6 shadow-lg border border-brand-border">
        <p className="text-sm uppercase tracking-wider text-brand-red font-bold">{title}</p>
        <p className="text-4xl lg:text-5xl font-bold mt-2 text-brand-red">{value}</p>
    </div>
);

const SliderInput: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step: number;
    formatValue: (value: number) => string;
}> = ({ label, value, onChange, min, max, step, formatValue }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-brand-medium-text">{label}</label>
            <span className="text-lg font-bold text-brand-dark-text">{formatValue(value)}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-thumb"
        />
    </div>
);


const AssumptionCard: React.FC<{ label: string; value: string; }> = ({ label, value }) => (
    <div className="bg-white rounded-lg p-4">
        <p className="text-sm text-brand-medium-text">{label}</p>
        <p className="text-xl font-bold text-brand-dark-text mt-1">{value}</p>
    </div>
);

const BenefitAnalysisBar: React.FC<{ name: string; value: string; percentage: number; colorClassName: string; }> = ({ name, value, percentage, colorClassName }) => (
    <div>
        <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-brand-medium-text">{name}</span>
            <span className="text-sm font-bold text-brand-dark-text">{value}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className={`${colorClassName} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
        </div>
    </div>
);

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;
    const html = text
        .split('**')
        .map((part, index) => (index % 2 === 1 ? `<strong class="text-brand-dark-text">${part}</strong>` : part))
        .join('');

    return <div className="text-brand-medium-text space-y-4" dangerouslySetInnerHTML={{ __html: html.replace(/\n/g, '<br />') }} />;
};


// --- PDF REPORT COMPONENT (FOR OFF-SCREEN RENDERING) ---

interface PdfReportProps {
    formData: any;
    calculations: any;
    assumptions: {
        employees: number;
        salary: number;
        trainingHours: number;
        turnover: number;
        replaceCost: number;
        term: number;
    };
    aiInsights: string;
    formatters: {
        formatCurrency: (value: number) => string;
        formatNumber: (value: number) => string;
        formatPercent: (value: number) => string;
        formatCurrencyK: (value: number) => string;
        formatMonths: (value: number) => string;
    };
    page1Ref: React.RefObject<HTMLDivElement>;
    page2Ref: React.RefObject<HTMLDivElement>;
}

const PdfReport: React.FC<PdfReportProps> = ({ formData, calculations, assumptions, aiInsights, formatters, page1Ref, page2Ref }) => {
    const { formatCurrency, formatPercent, formatNumber, formatCurrencyK, formatMonths } = formatters;
    const { term } = assumptions;
    
    const pageStyle: React.CSSProperties = {
        width: '210mm',
        minHeight: '297mm',
        backgroundColor: 'white',
        fontFamily: 'sans-serif',
        color: '#404041', // Set base typography color
    };

    const headingStyle: React.CSSProperties = {
        color: '#AF222A', // Carmine
        fontSize: '1.25rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
    };
    
    // This component uses a simple flex layout to prevent text-garbling issues with html2canvas
    const PdfTwoColumnGrid: React.FC<{ data: { label: string, value: string }[] }> = ({ data }) => (
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            {data.map(({ label, value }) => (
                <div key={label}>
                    <div className="text-brand-medium-text">{label}</div>
                    <div className="font-bold text-brand-dark-text">{value}</div>
                </div>
            ))}
        </div>
    );

    // New component for PDF bar chart for reliability
    const PdfBenefitBar: React.FC<{ label: string; value: string; percentage: number; }> = ({ label, value, percentage }) => (
        <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#404041' }}>
                <span>{label}</span>
                <span style={{ fontWeight: 'bold' }}>{value}</span>
            </div>
            <div style={{ height: '10px', backgroundColor: '#F1F1F2', borderRadius: '5px' }}>
                <div style={{
                    width: `${percentage}%`,
                    height: '10px',
                    backgroundColor: '#ED2F48', // Crimson
                    borderRadius: '5px'
                }}></div>
            </div>
        </div>
    );
    
    const clientInfoData = [
        { label: 'Company:', value: formData.company },
        { label: 'Contact:', value: `${formData['first-name']} ${formData['last-name']}` },
        { label: 'Email:', value: formData['business-email'] },
        { label: 'Phone:', value: formData.telephone },
        { label: 'Report Date:', value: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
        { label: 'Analysis Period:', value: `${term} Years` }
    ];

    const assumptionsData = [
        { label: 'Number of Employees', value: formatNumber(assumptions.employees) },
        { label: 'Average Employee Annual Salary', value: formatCurrency(assumptions.salary) },
        { label: 'Annual Employee Training Hours', value: `${assumptions.trainingHours} hours` },
        { label: 'Annual Employee Turnover Rate', value: formatPercent(assumptions.turnover) },
        { label: 'Replacement Cost per Employee', value: formatCurrency(assumptions.replaceCost) },
        { label: 'Subscription Term', value: `${assumptions.term} years` }
    ];
    
     const benefitsList = [
        { label: "Productivity Gains", value: calculations.productivityGains },
        { label: "Turnover Reduction Savings", value: calculations.turnoverReductionSavings },
        { label: "Training Time Savings", value: calculations.trainingTimeSavings },
    ];
    
    const maxBenefit = Math.max(...benefitsList.map(b => b.value), 1);


    return (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
            {/* --- PAGE 1 --- */}
            <div ref={page1Ref} style={pageStyle} className="p-8 flex flex-col">
                 <header className="mb-8">
                    <h1 className="text-4xl font-bold" style={{ color: '#AF222A' }}>Create One</h1>
                    <h2 className="text-4xl font-bold mt-1" style={{ color: '#404041' }}>
                        PowerShops Investment Analysis Report
                    </h2>
                </header>
                <div className="flex-grow pt-4">
                    <h3 style={headingStyle}>Client Information</h3>
                    <PdfTwoColumnGrid data={clientInfoData} />
                    
                    <h3 style={{...headingStyle, marginTop: '2rem'}}>Analysis Assumptions</h3>
                    <div className="bg-white p-6 rounded-lg">
                       <PdfTwoColumnGrid data={assumptionsData} />
                    </div>

                     <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#F1F1F2' }}>
                        <p className="font-bold text-brand-dark-text">PowerShops Annual Cost</p>
                        <p className="text-2xl font-bold text-brand-dark-text mt-1">{formatCurrency(calculations.powerShopsAnnualCost)}</p>
                        <p className="text-xs text-brand-medium-text mt-1">*Discounts apply for multi-year terms.</p>
                    </div>

                    <h3 style={{...headingStyle, marginTop: '2rem'}}>Executive Summary</h3>
                    <div style={{ backgroundColor: '#F1F1F2', padding: '1.5rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div>
                                <p style={{ textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '0.05em', color: '#404041', fontWeight: 'bold' }}>Total ROI</p>
                                <p style={{ fontSize: '2.25rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#ED2F48' }}>{formatPercent(calculations.totalRoi)}</p>
                            </div>
                            <div>
                                <p style={{ textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '0.05em', color: '#404041', fontWeight: 'bold' }}>Net Benefit</p>
                                <p style={{ fontSize: '2.25rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#ED2F48' }}>{formatCurrencyK(calculations.netBenefit)}</p>
                            </div>
                            <div>
                                <p style={{ textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '0.05em', color: '#404041', fontWeight: 'bold' }}>Break-Even</p>
                                <p style={{ fontSize: '2.25rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#ED2F48' }}>{formatMonths(calculations.monthsToBreakEven)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- PAGE 2 --- */}
            <div ref={page2Ref} style={pageStyle} className="p-8 flex flex-col justify-between">
                <div>
                    <h3 style={{...headingStyle, paddingTop: '2rem'}}>Benefit Analysis</h3>
                    <div className="mb-4">
                         {benefitsList.map(benefit => (
                            <PdfBenefitBar
                                key={benefit.label}
                                label={benefit.label}
                                value={formatCurrency(benefit.value)}
                                percentage={maxBenefit > 0 ? (benefit.value / maxBenefit) * 100 : 0}
                            />
                        ))}
                    </div>
                    <div className="bg-brand-red text-white rounded-lg p-4 flex justify-between items-center mt-6">
                        <span className="font-bold">Total Benefits Over {term} Years</span>
                        <span className="text-2xl font-bold">{formatCurrency(calculations.totalBenefit)}</span>
                    </div>

                    <div className="mt-8 text-brand-dark-text">
                        <h3 style={headingStyle}>Cash Flow Analysis</h3>
                        <AreaChart width={680} height={250} data={calculations.cashFlowData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis tickFormatter={(value) => formatCurrencyK(value)} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend wrapperStyle={{color: '#404041'}} />
                            <Area isAnimationActive={false} type="monotone" name="Cumulative Benefits" dataKey="cumulativeBenefit" stroke="#ED2F48" fill="#ED2F48" fillOpacity={0.2} />
                            <Area isAnimationActive={false} type="monotone" name="Cumulative Costs" dataKey="cumulativeCost" stroke="#5858B" fill="#5858B" fillOpacity={0.6} />
                        </AreaChart>
                    </div>

                    <div className="mt-8 p-6 border rounded-lg border-brand-border bg-brand-light-gray">
                        <div className="flex items-center mb-4">
                             <Sparkles className="h-6 w-6 text-brand-carmine mr-3" />
                            <h3 className="text-xl font-bold" style={{ color: '#AF222A' }}>AI-Powered Investment Insights</h3>
                        </div>
                        <div className="p-4 bg-white border border-brand-border rounded-lg">
                            <SimpleMarkdown text={aiInsights || "Insights not generated."} />
                        </div>
                    </div>
                </div>
                <footer className="text-center py-4 mt-auto border-t border-brand-border">
                    <div className="flex justify-between items-center text-sm text-brand-medium-text pt-4">
                        <span>www.createone.com</span>
                        <span>Contact: success@createone.com</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">&copy; 2025 PowerShops by Create One - All Rights Reserved</p>
                </footer>
            </div>
        </div>
    );
};


// --- MAIN APPLICATION COMPONENT ---

// Fix: Use a named export for the App component to resolve import issues.
export const App: React.FC = () => {
    const [showCalculator, setShowCalculator] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        'first-name': '',
        'last-name': '',
        'business-email': '',
        company: '',
        telephone: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        // @ts-ignore - aistudio is a global injected by the environment
        if (window.aistudio) {
            console.log("Running in AI Studio, skipping Netlify Function call.");
            // Simulate a short delay to show loading state
            await new Promise(resolve => setTimeout(resolve, 500));
            setShowCalculator(true);
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/track-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Function not found (404).');
                }
                throw new Error(`Server returned an error: ${response.status} ${response.statusText}`);
            }

            setShowCalculator(true);

        } catch (error) {
            console.error('Error submitting form to Netlify Function:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            let displayMessage = 'Sorry, there was an error submitting your details. Please try again.';
            if (errorMessage.includes('Function not found (404)')) {
                displayMessage = 'Submission failed. It seems the tracking function could not be reached.\n\nIf you are running this app locally, please make sure you are using the Netlify CLI (`netlify dev`) command to serve your project.';
            } else if (errorMessage.toLowerCase().includes('failed to fetch')) {
                 displayMessage = 'Submission failed due to a network error. Please check your internet connection and try again.';
            }
    
            alert(displayMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculator State - Set to minimums to force user interaction
    const [employees, setEmployees] = useState(10);
    const [salary, setSalary] = useState(20000);
    const [trainingHours, setTrainingHours] = useState(0);
    const [turnover, setTurnover] = useState(0);
    const [replaceCost, setReplaceCost] = useState(5000);
    const [term, setTerm] = useState(1);

    // AI Insights State
    const [aiInsights, setAiInsights] = useState('');
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [isRefreshDisabled, setIsRefreshDisabled] = useState(false);
    
    // PDF Generation State & Refs
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const pdfPage1Ref = useRef<HTMLDivElement>(null);
    const pdfPage2Ref = useRef<HTMLDivElement>(null);

    const formatters = useMemo(() => ({
        formatCurrency: (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value),
        formatNumber: (value: number) => new Intl.NumberFormat('en-US').format(value),
        formatPercent: (value: number) => `${Math.round(value)}%`,
        formatCurrencyK: (value: number) => {
             if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
             if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}K`;
             return formatters.formatCurrency(value);
        },
        formatMonths: (value: number) => value > 0 ? `${value.toFixed(1)} mo` : 'N/A',
    }), []);

    // Memoized Calculations
    const calculations = useMemo(() => {
        // Business logic assumptions
        const productivityBoost = 0.05; // 5%
        const turnoverReduction = 0.20; // 20%
        const trainingHoursSavedPerEmployee = 10;
        const workingHoursPerYear = 2080; // 52 weeks * 40 hours

        const costPerYearPerEmployee = [500, 475, 450, 425, 400]; // Y1 to Y5

        let totalInvestment = 0;
        for (let i = 0; i < term; i++) {
            // Use the cost for the specific year, or the last cost if term > 5
            const annualCostForYear = employees * (costPerYearPerEmployee[i] || costPerYearPerEmployee[costPerYearPerEmployee.length - 1]);
            totalInvestment += annualCostForYear;
        }
        
        const averageAnnualCost = term > 0 ? totalInvestment / term : 0;
        
        // The displayed annual cost is now the average cost over the term.
        const powerShopsAnnualCost = averageAnnualCost;

        const hourlyRate = salary / workingHoursPerYear;

        const annualProductivityGains = employees * salary * productivityBoost;
        const annualTurnoverSavings = employees * (turnover / 100) * turnoverReduction * replaceCost;
        const annualTrainingSavings = employees * trainingHoursSavedPerEmployee * hourlyRate;
        const annualBenefit = annualProductivityGains + annualTurnoverSavings + annualTrainingSavings;

        const productivityGains = annualProductivityGains * term;
        const turnoverReductionSavings = annualTurnoverSavings * term;
        const trainingTimeSavings = annualTrainingSavings * term;

        const totalBenefit = productivityGains + turnoverReductionSavings + trainingTimeSavings;
        const netBenefit = totalBenefit - totalInvestment;
        const totalRoi = totalInvestment > 0 ? (netBenefit / totalInvestment) * 100 : 0;

        const monthsToBreakEven = (annualBenefit > 0 && annualBenefit > averageAnnualCost) ? (totalInvestment / (annualBenefit - averageAnnualCost)) * 12 : 0;

        const cashFlowData = [];
        let cumulativeCost = 0;
        for (let i = 0; i <= term; i++) {
            const year = i;
            const cumulativeBenefit = annualBenefit * year;

            if (year > 0) {
                const annualCostForYear = employees * (costPerYearPerEmployee[year - 1] || costPerYearPerEmployee[costPerYearPerEmployee.length - 1]);
                cumulativeCost += annualCostForYear;
            }

            cashFlowData.push({
                year: `Year ${year}`,
                cumulativeBenefit,
                cumulativeCost,
                netCashFlow: cumulativeBenefit - cumulativeCost,
            });
        }

        return {
            powerShopsAnnualCost,
            totalInvestment,
            productivityGains,
            turnoverReductionSavings,
            trainingTimeSavings,
            totalBenefit,
            netBenefit,
            totalRoi,
            monthsToBreakEven,
            cashFlowData,
        };
    }, [employees, salary, turnover, replaceCost, term]);

    const getAiInsights = useCallback(async () => {
        setIsLoadingAi(true);
        setAiInsights('');
        setIsRefreshDisabled(true);

        const systemInstruction = `
            You are a business analyst providing a professional summary of a Return on Investment (ROI) calculation for "PowerShops".
            Your response must be structured into three specific sections, using Markdown for bold headings. **Each section must be a single, concise paragraph (2-3 sentences max).**
            1. **Investment Value Assessment**: State the ROI, net benefit, and payback period. Explain what these strong numbers mean for the business.
            2. **Key Performance Drivers**: Identify the largest benefit contributor (e.g., Productivity Gains). Explain the operational improvements this suggests.
            3. **Strategic Recommendations**: Based on the strong ROI, recommend immediate implementation and tracking success.
            The tone should be authoritative and persuasive.
        `;

        const userPrompt = `
            Generate a concise investment analysis based on this data:
            - Number of Employees: ${employees}
            - Subscription Term: ${term} years
            - Total ROI: ${formatters.formatPercent(calculations.totalRoi)}
            - Net Benefit: ${formatters.formatCurrency(calculations.netBenefit)}
            - Payback Period: ${formatters.formatMonths(calculations.monthsToBreakEven)}
            - Benefit Breakdown: Productivity Gains are ${calculations.totalBenefit > 0 ? Math.round(calculations.productivityGains / calculations.totalBenefit * 100) : 0}% of the total benefit.
            ${calculations.totalRoi > 50 ? "Because the ROI is high, conclude the 'Strategic Recommendations' section with a call to action: 'Schedule a demo to learn more about PowerShops.'" : ""}
        `;

        try {
            // New: Call the Netlify function instead of Gemini directly
            const response = await fetch('/.netlify/functions/get-ai-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userPrompt, systemInstruction }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Use the error message from the function's response if available
                throw new Error(data.error || `Server error: ${response.status}`);
            }

            setAiInsights(data.insights);

        } catch (error) {
            console.error("Error fetching AI insights:", error);
            setAiInsights(
                error instanceof Error 
                    ? `We're sorry, an error occurred: ${error.message}`
                    : "An unknown error occurred while generating insights."
            );
        } finally {
            setIsLoadingAi(false);
            setTimeout(() => {
                setIsRefreshDisabled(false);
            }, 5000); // 5-second cooldown
        }
    }, [term, calculations, employees, formatters]);
    
    const downloadReport = async () => {
        setIsGeneratingPdf(true);
        await new Promise(resolve => setTimeout(resolve, 100)); // Delay for render

        const page1Element = pdfPage1Ref.current;
        const page2Element = pdfPage2Ref.current;
        
        if (!page1Element || !page2Element) {
            console.error("PDF pages not found in the DOM.");
            setIsGeneratingPdf(false);
            return;
        }

        try {
            const pdf = new jsPDF('p', 'mm', 'a4', true);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // --- PAGE 1 ---
            const canvas1 = await html2canvas(page1Element, { scale: 2, logging: false, useCORS: true });
            pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            
            pdf.addPage();
            
            // --- PAGE 2 ---
            const canvas2 = await html2canvas(page2Element, { scale: 2, logging: false, useCORS: true });
            pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

            pdf.save('PowerShops_ROI_Report.pdf');
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Sorry, there was an error generating the PDF report.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    if (!showCalculator) {
        return (
             <div className="min-h-screen flex items-center justify-center bg-white p-4 font-sans">
                <div className="max-w-5xl w-full grid md:grid-cols-2 gap-16 items-center">
                    <div className="p-4">
                        <Logo />
                        <h1 className="text-6xl font-bold text-brand-dark-text mb-6 leading-tight">Unlock Your Business Potential</h1>
                        <p className="text-brand-medium-text text-lg mb-8">Discover the tangible financial impact of PowerShops on your organization. Fill out the form to access our interactive ROI calculator and see how much you can save.</p>
                        <ul className="space-y-4 text-brand-medium-text">
                           <li className="flex items-start"><TrendingUp className="h-6 w-6 mr-3 text-brand-red flex-shrink-0 mt-1" /><span>Quantify productivity gains and cost savings.</span></li>
                           <li className="flex items-start"><FileText className="h-6 w-6 mr-3 text-brand-red flex-shrink-0 mt-1" /><span>Generate a personalized report for your stakeholders.</span></li>
                           <li className="flex items-start"><BrainCircuit className="h-6 w-6 mr-3 text-brand-red flex-shrink-0 mt-1" /><span>Get AI-powered insights tailored to your results.</span></li>
                        </ul>
                    </div>
                    <div className="bg-brand-light-gray p-8 rounded-xl shadow-lg border border-brand-border">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-brand-dark-text mb-1">Get Instant Access</h2>
                            <p className="text-brand-medium-text">See your potential ROI in minutes.</p>
                        </div>
                        <form name="roi-lead-capture" onSubmit={handleFormSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <input type="text" name="first-name" placeholder="First Name" value={formData['first-name']} onChange={handleFormInputChange} required className="p-3 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-red focus:outline-none" />
                                <input type="text" name="last-name" placeholder="Last Name" value={formData['last-name']} onChange={handleFormInputChange} required className="p-3 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-red focus:outline-none" />
                            </div>
                            <div className="mb-4">
                                <input type="email" name="business-email" placeholder="Business Email" value={formData['business-email']} onChange={handleFormInputChange} required className="w-full p-3 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-red focus:outline-none" />
                            </div>
                             <div className="mb-4">
                                <input type="tel" name="telephone" placeholder="Phone Number" value={formData.telephone} onChange={handleFormInputChange} required className="w-full p-3 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-red focus:outline-none" />
                            </div>
                            <div className="mb-6">
                                <input type="text" name="company" placeholder="Company Name" value={formData.company} onChange={handleFormInputChange} required className="w-full p-3 border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-red focus:outline-none" />
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full bg-brand-red text-white font-bold py-3 px-4 rounded-lg hover:bg-carmine transition duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        Calculate ROI <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
    
    const emailSubject = "PowerShops Demo Request";
    const emailBody = `Hi, I'm ${formData['first-name']} ${formData['last-name']} from ${formData.company}. I'd like to schedule a demo of PowerShops.\n\nMy calculated ROI is ${formatters.formatPercent(calculations.totalRoi)} with a net benefit of ${formatters.formatCurrency(calculations.netBenefit)}.\n\nPlease contact me at ${formData['business-email']} or ${formData.telephone} to schedule a time.`;
    const mailtoLink = `mailto:success@createone.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    const { formatCurrency, formatPercent, formatNumber, formatCurrencyK, formatMonths } = formatters;
    const assumptions = { employees, salary, trainingHours, turnover, replaceCost, term };
    
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="p-4 bg-white rounded-lg shadow-lg border border-brand-border">
                    <p className="font-bold text-brand-dark-text">{label}</p>
                    <p className="text-sm text-brand-red">{`Benefits: ${formatCurrency(payload[0].value)}`}</p>
                    <p className="text-sm text-brand-dark-gray">{`Costs: ${formatCurrency(payload[1].value)}`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <>
        {isGeneratingPdf && <PdfReport formData={formData} calculations={calculations} assumptions={assumptions} aiInsights={aiInsights} formatters={formatters} page1Ref={pdfPage1Ref} page2Ref={pdfPage2Ref} />}
        <div className="bg-white font-sans text-brand-dark-text">
            <header className="bg-white p-8 border-b border-brand-border">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-4">
                         <Logo />
                        <button
                            onClick={() => setShowCalculator(false)}
                            className="flex items-center text-sm px-4 py-2 rounded-lg border-2 border-brand-medium-text text-brand-medium-text hover:border-brand-red hover:text-brand-red transition-colors"
                            aria-label="Go back to entry form"
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            Back to Form
                        </button>
                    </div>
                    <h1 className="text-4xl font-bold text-brand-dark-text">PowerShops Investment Analysis Report</h1>
                </div>
            </header>

            <main className="py-8 px-4">
                 <div className="max-w-4xl mx-auto bg-brand-light-gray rounded-xl shadow-lg overflow-hidden">
                    {/* --- Client Information --- */}
                    <div className="p-8">
                        <h3 className="text-sm font-bold text-brand-carmine tracking-wider uppercase mb-4">Client Information</h3>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                            <div><span className="text-brand-medium-text">Company:</span><br/><strong className="text-brand-dark-text">{formData.company}</strong></div>
                            <div><span className="text-brand-medium-text">Contact:</span><br/><strong className="text-brand-dark-text">{formData['first-name']} {formData['last-name']}</strong></div>
                            <div><span className="text-brand-medium-text">Email:</span><br/><strong className="text-brand-dark-text">{formData['business-email']}</strong></div>
                            <div><span className="text-brand-medium-text">Phone:</span><br/><strong className="text-brand-dark-text">{formData.telephone}</strong></div>
                            <div><span className="text-brand-medium-text">Report Date:</span><br/><strong className="text-brand-dark-text">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></div>
                            <div><span className="text-brand-medium-text">Analysis Period:</span><br/><strong className="text-brand-dark-text">{term} Years</strong></div>
                        </div>
                    </div>

                    {/* --- Analysis Assumptions --- */}
                    <div className="p-8 border-t border-brand-border">
                        <h3 className="text-xl font-bold text-brand-carmine mb-4">Analysis Assumptions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                           <SliderInput label="Number of Employees" value={employees} onChange={setEmployees} min={10} max={2000} step={10} formatValue={formatNumber} />
                           <SliderInput label="Average Employee Annual Salary" value={salary} onChange={setSalary} min={20000} max={200000} step={1000} formatValue={formatCurrency} />
                           <SliderInput label="Annual Employee Training Hours" value={trainingHours} onChange={setTrainingHours} min={0} max={100} step={1} formatValue={(v) => `${v} hrs`} />
                           <SliderInput label="Annual Employee Turnover Rate" value={turnover} onChange={setTurnover} min={0} max={100} step={1} formatValue={formatPercent} />
                           <SliderInput label="Replacement Cost per Employee" value={replaceCost} onChange={setReplaceCost} min={5000} max={100000} step={1000} formatValue={formatCurrency} />
                           <SliderInput label="Subscription Term" value={term} onChange={setTerm} min={1} max={5} step={1} formatValue={(v) => `${v} years`} />
                        </div>
                        <div className="mt-8 bg-white border border-brand-border rounded-lg p-4">
                            <p className="font-bold text-brand-dark-text">PowerShops Annual Cost</p>
                            <p className="text-2xl font-bold text-brand-dark-text mt-1">{formatCurrency(calculations.powerShopsAnnualCost)}</p>
                            <p className="text-xs text-brand-medium-text mt-1">*Discounts apply for multi-year terms.</p>
                        </div>
                    </div>
                    
                    {/* --- Executive Summary --- */}
                    <div className="p-8 border-t border-brand-border">
                        <h3 className="text-xl font-bold text-brand-carmine mb-4">Executive Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <ExecutiveSummaryCard title="Total ROI" value={formatPercent(calculations.totalRoi)} />
                            <ExecutiveSummaryCard title="Net Benefit" value={formatCurrencyK(calculations.netBenefit)} />
                            <ExecutiveSummaryCard title="Break-Even" value={formatMonths(calculations.monthsToBreakEven)} />
                        </div>
                    </div>

                    {/* --- Benefit Analysis --- */}
                    <div className="p-8 border-t border-brand-border">
                        <h3 className="text-xl font-bold text-brand-carmine mb-4">Benefit Analysis</h3>
                         <div className="space-y-4 mb-4">
                            <BenefitAnalysisBar name="Productivity Gains" value={formatCurrency(calculations.productivityGains)} percentage={calculations.totalBenefit > 0 ? calculations.productivityGains / calculations.totalBenefit * 100 : 0} colorClassName="bg-brand-red" />
                            <BenefitAnalysisBar name="Turnover Reduction Savings" value={formatCurrency(calculations.turnoverReductionSavings)} percentage={calculations.totalBenefit > 0 ? calculations.turnoverReductionSavings / calculations.totalBenefit * 100 : 0} colorClassName="bg-brand-red" />
                            <BenefitAnalysisBar name="Training Time Savings" value={formatCurrency(calculations.trainingTimeSavings)} percentage={calculations.totalBenefit > 0 ? calculations.trainingTimeSavings / calculations.totalBenefit * 100 : 0} colorClassName="bg-brand-red" />
                        </div>
                         <div className="bg-brand-red text-white rounded-lg p-4 flex justify-between items-center mt-6">
                            <span className="font-bold">Total Benefits Over {term} Years</span>
                            <span className="text-2xl font-bold">{formatCurrency(calculations.totalBenefit)}</span>
                        </div>
                    </div>

                    {/* --- Cash Flow Analysis --- */}
                    <div className="p-8 border-t border-brand-border">
                        <h3 className="text-xl font-bold text-brand-carmine mb-4">Cash Flow Analysis</h3>
                        <div className="h-80 -ml-4">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={calculations.cashFlowData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="year" />
                                    <YAxis tickFormatter={(value) => formatCurrencyK(value)} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Area type="monotone" dataKey="cumulativeBenefit" name="Cumulative Benefits" stroke="#ED2F48" fill="#ED2F48" fillOpacity={0.2} />
                                    <Area type="monotone" dataKey="cumulativeCost" name="Cumulative Costs" stroke="#58585B" fill="#58585B" fillOpacity={0.6} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* --- AI Insights --- */}
                    <div className="p-8 border-t border-brand-border">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center">
                                <Sparkles className="h-6 w-6 text-brand-carmine mr-3" />
                                <h3 className="text-xl font-bold text-brand-carmine">AI-Powered Investment Insights</h3>
                            </div>
                           {aiInsights && !isLoadingAi && (
                                <button onClick={getAiInsights} disabled={isRefreshDisabled} className="flex items-center text-sm px-4 py-2 rounded-lg border-2 border-brand-medium-text text-brand-medium-text hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isRefreshDisabled ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                    {isRefreshDisabled ? 'Wait...' : 'Regenerate'}
                                </button>
                            )}
                        </div>
                        <div className="p-6 bg-white border border-brand-border rounded-lg min-h-[150px] flex items-center justify-center">
                             {isLoadingAi ? (
                                <div className="text-center">
                                    <Loader2 className="animate-spin h-8 w-8 text-brand-red mx-auto mb-2" />
                                    <p className="text-brand-medium-text">Analyzing your results...</p>
                                </div>
                            ) : aiInsights ? (
                                <SimpleMarkdown text={aiInsights} />
                            ) : (
                                <div className="text-center">
                                    <p className="text-brand-medium-text mb-4">Unlock strategic recommendations based on your data.</p>
                                    <button onClick={getAiInsights} disabled={isLoadingAi} className="flex items-center justify-center bg-brand-red text-white font-bold py-2 px-4 rounded-lg hover:bg-carmine transition duration-300 disabled:opacity-50">
                                        <Sparkles className="mr-2 h-5 w-5" /> Generate Insights
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                 </div>
            </main>
            
            <footer className="py-8 px-4">
                <div className="max-w-4xl mx-auto text-center border-t border-brand-border pt-8">
                     <h2 className="text-3xl font-bold text-brand-dark-text">Ready to Unlock Your Potential?</h2>
                    <p className="text-brand-medium-text my-4 max-w-2xl mx-auto">See how PowerShops can transform your organization. Schedule a personalized demo with our team to explore the platform's features and discuss your specific business needs.</p>
                    <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                        <button onClick={downloadReport} disabled={isGeneratingPdf} className="flex items-center justify-center bg-white text-brand-red font-bold py-3 px-6 rounded-lg border-2 border-brand-red hover:bg-brand-red hover:text-white transition duration-300 w-full sm:w-auto disabled:opacity-50">
                             {isGeneratingPdf ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Download className="mr-2 h-5 w-5" />}
                             {isGeneratingPdf ? 'Generating PDF...' : 'Download Full Report'}
                        </button>
                         <a href={mailtoLink} className="flex items-center justify-center bg-brand-red text-white font-bold py-3 px-6 rounded-lg hover:bg-carmine transition duration-300 w-full sm:w-auto">
                            <Users className="mr-2 h-5 w-5" /> Schedule a Demo
                        </a>
                    </div>
                </div>
                <div className="max-w-4xl mx-auto text-center border-t border-brand-border pt-8 mt-8">
                     <div className="flex justify-between items-center text-sm text-brand-medium-text">
                        <a href="https://www.createone.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-red transition-colors">www.createone.com</a>
                        <span>Contact: success@createone.com</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-4">&copy; {new Date().getFullYear()} PowerShops by Create One - All Rights Reserved</p>
                </div>
            </footer>
        </div>
        </>
    );
};