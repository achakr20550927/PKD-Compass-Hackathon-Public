export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hasSeedAccess } from '@/lib/seed-auth';

const CATEGORIES = [
    { name: 'SUPPORT_GROUP', label: 'Support Groups' },
    { name: 'ADVOCACY', label: 'Advocacy Organizations' },
    { name: 'HOSPITALS', label: 'Hospitals & Renal Centers' },
];

const RESOURCES = [
    // ── NORTH AMERICA ──
    // USA - MID-ATLANTIC (MD, NY, NJ, PA, VA)
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Johns Hopkins Hospital - Nephrology', summary: 'Global leader in adult and pediatric kidney care, research, and transplantation.',
        city: 'Baltimore', state: 'MD', country: 'USA', lat: 39.2971, lng: -76.5930, website: 'https://www.hopkinsmedicine.org', services: ['Transplant', 'Dialysis', 'Genetics'], labels: ['TOP RANKED'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'University of Maryland Medical Center', summary: 'Comprehensive renal care and active clinical trials for PKD.',
        city: 'Baltimore', state: 'MD', country: 'USA', website: 'https://www.umms.org/ummc', labels: ['RESEARCH HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'NKF Serving Maryland & Delaware', summary: 'Local support, screening, and peer assistance for kidney patients in MD/DE.',
        city: 'Baltimore', state: 'MD', country: 'USA', website: 'https://www.kidney.org/offices/nkf-serving-maryland-and-delaware', labels: ['REGIONAL'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'ADVOCACY', name: 'Maryland Kidney Advocacy Network', summary: 'Grassroots advocacy for state-level kidney care policy improvements.',
        city: 'Annapolis', state: 'MD', country: 'USA', website: 'https://www.kidney.org/advocacy', labels: ['POLICY'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'New York-Presbyterian/Columbia', summary: 'Leading NYC hospital for PKD genetics and specialized transplant surgery.',
        city: 'New York', state: 'NY', country: 'USA', website: 'https://www.nyp.org', labels: ['IVY LEAGUE'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'NYU Langone Health - Transplant Institute', summary: 'Advanced kidney care and robotic-assisted transplant surgery.',
        city: 'New York', state: 'NY', country: 'USA', website: 'https://nyulangone.org', labels: ['SURGICAL EXCELLENCE'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'PKD Foundation - NYC Chapter', summary: 'Connecting New York City residents fighting PKD through local walks and meetups.',
        city: 'New York', state: 'NY', country: 'USA', website: 'https://pkdcure.org/chapter/greater-new-york-city/', labels: ['PKD FOCUS'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'ADVOCACY', name: 'NKF Serving Greater New York', summary: 'Major advocacy and support hub for the Tri-State area patients.',
        city: 'New York', state: 'NY', country: 'USA', website: 'https://www.kidney.org/offices/nkf-serving-greater-new-york', labels: ['ADVOCACY'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Hackensack University Medical Center', summary: 'Top-rated nephrology program in New Jersey with a dedicated kidney center.',
        city: 'Hackensack', state: 'NJ', country: 'USA', website: 'https://www.hackensackmeridianhealth.org', labels: ['REGIONAL LEADER'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Robert Wood Johnson University Hospital', summary: 'Academic medical center with comprehensive renal replacement therapies.',
        city: 'New Brunswick', state: 'NJ', country: 'USA', website: 'https://www.rwjbh.org', labels: ['ACADEMIC'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'New Jersey Kidney Care Support', summary: 'Dedicated patient support and resource navigation for NJ residents.',
        city: 'Newark', state: 'NJ', country: 'USA', website: 'https://www.kidney.org/offices/nkf-serving-greater-new-york', labels: ['LOCAL'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Hospital of the University of Pennsylvania (HUP)', summary: 'Elite academic medical center with world-class nephrology research.',
        city: 'Philadelphia', state: 'PA', country: 'USA', website: 'https://www.pennmedicine.org', labels: ['TOP RANKED'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Thomas Jefferson University Hospital', summary: 'Leading transplant center and renal research hub in Philadelphia.',
        city: 'Philadelphia', state: 'PA', country: 'USA', website: 'https://www.jeffersonhealth.org', labels: ['CENTER OF EXCELLENCE'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'UVA Health System - Nephrology', summary: 'Comprehensive care for inherited kidney diseases and transplant.',
        city: 'Charlottesville', state: 'VA', country: 'USA', website: 'https://uvahealth.com', labels: ['CENTER OF EXCELLENCE'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'VCU Medical Center', summary: 'Leading academic center in Richmond for complex renal cases.',
        city: 'Richmond', state: 'VA', country: 'USA', website: 'https://www.vcuhealth.org', labels: ['REGION TOP'], cost: 'INSURANCE'
    },

    // USA - MIDWEST (OH, MN, IL, MI, IN, WI, MO, KS, IA)
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Cleveland Clinic', summary: 'Ranked world-best for urology and nephrology clinical outcomes.',
        city: 'Cleveland', state: 'OH', country: 'USA', website: 'https://my.clevelandclinic.org', labels: ['GLOBAL TOP'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Ohio State University Wexner Medical Center', summary: 'Leading academic nephrology center in Columbus.',
        city: 'Columbus', state: 'OH', country: 'USA', website: 'https://wexnermedical.osu.edu', labels: ['ACADEMIC'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'PKD Foundation - Cleveland Chapter', summary: 'Local support for cystic kidney disease families in Northern Ohio.',
        city: 'Cleveland', state: 'OH', country: 'USA', website: 'https://pkdcure.org/chapter/cleveland/', labels: ['PKD FOCUS'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Mayo Clinic - Rochester', summary: 'The ultimate diagnostic hub for complex and rare kidney disorders.',
        city: 'Rochester', state: 'MN', country: 'USA', website: 'https://www.mayoclinic.org', labels: ['DIAGNOSTIC HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'M Health Fairview University of Minnesota Medical Center', summary: 'Pioneering kidney transplant programs and renal research.',
        city: 'Minneapolis', state: 'MN', country: 'USA', website: 'https://www.mhealthfairview.org', labels: ['TRANSPLANT FOCUS'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'Minnesota Kidney Community', summary: 'A network for patients and caregivers across the Twin Cities.',
        city: 'Minneapolis', state: 'MN', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Northwestern Memorial Hospital', summary: 'Elite nephrology care and clinical trials for ADPKD.',
        city: 'Chicago', state: 'IL', country: 'USA', website: 'https://www.nm.org', labels: ['TOP RANKED'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'University of Chicago Medical Center', summary: 'Comprehensive care for genetic kidney diseases.',
        city: 'Chicago', state: 'IL', country: 'USA', website: 'https://www.uchicagomedicine.org', labels: ['PKD FOCUS'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'NKF of Illinois Support Services', summary: 'Vast resource network for dialysis and transplant patients in Chicago.',
        city: 'Chicago', state: 'IL', country: 'USA', website: 'https://www.nkfi.org', labels: ['REGIONAL'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'ADVOCACY', name: 'Illinois Renal Council', summary: 'Advocating for legislative changes to benefit Illinois kidney patients.',
        city: 'Springfield', state: 'IL', country: 'USA', website: 'https://www.nkfi.org/advocacy', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'University of Michigan Health (Ann Arbor)', summary: 'Top-tier academic medical center with specialized PKD clinics.',
        city: 'Ann Arbor', state: 'MI', country: 'USA', website: 'https://www.uofmhealth.org', labels: ['RESEARCH HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Beaumont Hospital - Royal Oak', summary: 'Leading renal care provider in Southeast Michigan.',
        city: 'Royal Oak', state: 'MI', country: 'USA', website: 'https://www.beaumont.org', labels: ['SURGICAL EXCELLENCE'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'IU Health Methodist Hospital', summary: 'Vast network for dialysis and specialized kidney transplants.',
        city: 'Indianapolis', state: 'IN', country: 'USA', website: 'https://iuhealth.org', labels: ['TRANSPLANT HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Riley Hospital for Children', summary: 'Elite pediatric nephrology services and transplant in Indiana.',
        city: 'Indianapolis', state: 'IN', country: 'USA', website: 'https://www.rileychildrens.org', labels: ['PEDIATRICS'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Froedtert & Medical College of Wisconsin', summary: 'Academic health system with advanced nephrology services.',
        city: 'Milwaukee', state: 'WI', country: 'USA', website: 'https://www.froedtert.com', labels: ['ACADEMIC'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'University of Wisconsin Health', summary: 'Leading transplant center and renal research hub in Madison.',
        city: 'Madison', state: 'WI', country: 'USA', website: 'https://www.uwhealth.org', labels: ['TRANSPLANT HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Barnes-Jewish Hospital', summary: 'Consistently ranked among the best in the nation for nephrology.',
        city: 'St. Louis', state: 'MO', country: 'USA', website: 'https://www.barnesjewish.org', labels: ['ELITE CARE'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'SSM Saint Louis University Hospital', summary: 'Designated PKD Center of Excellence in Missouri.',
        city: 'St. Louis', state: 'MO', country: 'USA', website: 'https://www.ssmhealth.com', labels: ['CENTER OF EXCELLENCE'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'University of Kansas Health System', summary: 'Comprehensive kidney care and transplant services in the Midwest.',
        city: 'Kansas City', state: 'KS', country: 'USA', website: 'https://www.kansashealthsystem.com', labels: ['TRANSPLANT HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Stormont Vail Health', summary: 'Specialized renal care and dialysis services in Topeka.',
        city: 'Topeka', state: 'KS', country: 'USA', website: 'https://www.stormontvail.org', labels: ['REGIONAL'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'University of Iowa Hospitals & Clinics', summary: 'The only comprehensive academic medical center in Iowa.',
        city: 'Iowa City', state: 'IA', country: 'USA', website: 'https://uihc.org', labels: ['ACADEMIC'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Iowa Methodist Medical Center', summary: 'Leading renal care provider in Des Moines.',
        city: 'Des Moines', state: 'IA', country: 'USA', website: 'https://www.unitypoint.org', labels: ['CENTRAL HUB'], cost: 'INSURANCE'
    },

    // USA - SOUTH (TX, FL, GA, NC, SC, AL, TN, AR, LA, MS)
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Texas Children’s Hospital', summary: 'Elite pediatric nephrology with dedicated ARPKD programs.',
        city: 'Houston', state: 'TX', country: 'USA', website: 'https://www.texaschildrens.org', labels: ['PEDIATRICS'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Methodist Hospital - Houston', summary: 'Advanced adult kidney transplant and specialized renal care.',
        city: 'Houston', state: 'TX', country: 'USA', website: 'https://www.houstonmethodist.org', labels: ['TRANSPLANT HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'UT Southwestern Medical Center', summary: 'Leading destination for ADPKD research and clinical trials in Dallas.',
        city: 'Dallas', state: 'TX', country: 'USA', website: 'https://www.utswmed.org', labels: ['RESEARCH HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'PKD Foundation - Houston Chapter', summary: 'Active community in Texas for PKD patient empowerment.',
        city: 'Houston', state: 'TX', country: 'USA', website: 'https://pkdcure.org/chapter/houston/', labels: ['TEXAS HUB'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Mayo Clinic - Jacksonville', summary: 'Leading Florida hub for polycystic kidney disease research.',
        city: 'Jacksonville', state: 'FL', country: 'USA', website: 'https://www.mayoclinic.org', labels: ['CENTER OF EXCELLENCE'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Cleveland Clinic Florida', summary: 'Comprehensive renal medicine and transplant services in South Florida.',
        city: 'Weston', state: 'FL', country: 'USA', website: 'https://my.clevelandclinic.org/florida', labels: ['SURGICAL HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'University of Miami Health System (UHealth)', summary: 'Elite academic medical center with a dedicated kidney institute.',
        city: 'Miami', state: 'FL', country: 'USA', website: 'https://umiamihealth.org', labels: ['ACADEMIC'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'NKF of Florida - Miami Division', summary: 'Empowering South Florida kidney patients through education and peer support.',
        city: 'Miami', state: 'FL', country: 'USA', website: 'https://www.kidneyfl.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'ADVOCACY', name: 'Florida Renal Coalition', summary: 'Advocacy group focused on expanding transplant access in Florida.',
        city: 'Tallahassee', state: 'FL', country: 'USA', website: 'https://www.kidneyfl.org/advocacy', labels: ['LEGISLATIVE'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Emory University Hospital', summary: 'Recognized PKD Center of Excellence with high transplant volume.',
        city: 'Atlanta', state: 'GA', country: 'USA', website: 'https://www.emoryhealthcare.org', labels: ['CENTER OF EXCELLENCE'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Piedmont Atlanta Hospital', summary: 'Leading private renal transplant program in Georgia.',
        city: 'Atlanta', state: 'GA', country: 'USA', website: 'https://www.piedmont.org', labels: ['TRANSPLANT HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'Georgia Kidney Support Network', summary: 'Local meetups and financial assistance resources in Georgia.',
        city: 'Atlanta', state: 'GA', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Duke University Hospital', summary: 'Elite academic center for genetic kidney disease research.',
        city: 'Durham', state: 'NC', country: 'USA', website: 'https://www.dukehealth.org', labels: ['TOP RANKED'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'UNC Medical Center', summary: 'Comprehensive care for glomerular diseases and transplant in NC.',
        city: 'Chapel Hill', state: 'NC', country: 'USA', website: 'https://www.uncmedicalcenter.org', labels: ['ACADEMIC'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'MUSC Health (Charleston)', summary: 'Academic leader for nephrology and transplant in South Carolina.',
        city: 'Charleston', state: 'SC', country: 'USA', website: 'https://muschealth.org', labels: ['ACADEMIC'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Prisma Health Richland Hospital', summary: 'Major renal hub for Columbia and the SC midlands.',
        city: 'Columbia', state: 'SC', country: 'USA', website: 'https://prismahealth.org', labels: ['REGIONAL'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'UAB Hospital - Nephrology', summary: 'Leading renal center in the deep South for transplant and dialysis.',
        city: 'Birmingham', state: 'AL', country: 'USA', website: 'https://www.uabmedicine.org', labels: ['REGION TOP'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Huntsville Hospital', summary: 'Primary renal resource hub for Northern Alabama.',
        city: 'Huntsville', state: 'AL', country: 'USA', website: 'https://www.huntsvillehospital.org', labels: ['REGIONAL'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Vanderbilt University Medical Center', summary: 'World-class nephrology care and multi-organ transplant programs.',
        city: 'Nashville', state: 'TN', country: 'USA', website: 'https://www.vanderbilthealth.com', labels: ['TOP RANKED'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Methodist University Hospital', summary: 'Leading kidney transplant program in Memphis.',
        city: 'Memphis', state: 'TN', country: 'USA', website: 'https://www.methodisthealth.org', labels: ['TRANSPLANT HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'UAMS Medical Center', summary: 'Advanced kidney disease management and transplant hub in Arkansas.',
        city: 'Little Rock', state: 'AR', country: 'USA', website: 'https://uamshealth.com', labels: ['TRANSPLANT HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Baptist Health Medical Center', summary: 'Specialized renal care and dialysis in Little Rock.',
        city: 'Little Rock', state: 'AR', country: 'USA', website: 'https://www.baptist-health.com', labels: ['REGIONAL'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Ochsner Medical Center', summary: 'Top-rated transplant center in the Gulf South region.',
        city: 'New Orleans', state: 'LA', country: 'USA', website: 'https://www.ochsner.org', labels: ['ELITE CARE'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Tulane Medical Center', summary: 'Academic hub for renal research and complex nephrology in LA.',
        city: 'New Orleans', state: 'LA', country: 'USA', website: 'https://www.tulanehealtchare.com', labels: ['ACADEMIC'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'University of Mississippi Medical Center (UMMC)', summary: 'Comprehensive renal services and dialysis care in Mississippi.',
        city: 'Jackson', state: 'MS', country: 'USA', website: 'https://www.umc.edu', labels: ['STATE LEADER'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Baptist Memorial Hospital - Memphis', summary: 'Serving patients from Mississippi with advanced renal oncology and transplant.',
        city: 'Memphis', state: 'TN', country: 'USA', website: 'https://www.baptistonline.org', labels: ['REGIONAL HUB'], cost: 'INSURANCE'
    },

    // USA - WEST (CA, WA, AZ, OR, NV, CO, UT, NM)
    {
        continent: 'North America', category: 'HOSPITALS', name: 'UCLA Health - Renal Center', summary: 'Top California program for ADPKD clinical trials and management.',
        city: 'Los Angeles', state: 'CA', country: 'USA', website: 'https://www.uclahealth.org', labels: ['CALIFORNIA TOP'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'UCSF Medical Center', summary: 'Leading destination for complex kidney cases and robotic transplant.',
        city: 'San Francisco', state: 'CA', country: 'USA', website: 'https://www.ucsfhealth.org', labels: ['PKD FOCUS'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Stanford Health Care - Kidney Transplant Program', summary: 'World-renowned for immunology and complex renal transplantation.',
        city: 'Palo Alto', state: 'CA', country: 'USA', website: 'https://stanfordhealthcare.org', labels: ['TOP RANKED'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Cedars-Sinai Medical Center - Nephrology', summary: 'Leading Los Angeles hub for renal diagnostics and clinical care.',
        city: 'Los Angeles', state: 'CA', country: 'USA', website: 'https://www.cedars-sinai.org', labels: ['ELITE CARE'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'NKF of Southern California', summary: 'Major support hub for patients from LA to San Diego.',
        city: 'Los Angeles', state: 'CA', country: 'USA', website: 'https://www.kidneysocal.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'PKD Foundation - Bay Area Chapter', summary: 'Strong support network for families in San Francisco and San Jose.',
        city: 'San Francisco', state: 'CA', country: 'USA', website: 'https://pkdcure.org/chapter/san-francisco-bay-area/', labels: ['PKD FOCUS'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'University of Washington Medical Center', summary: 'Elite nephrology care and hub for many clinical trials.',
        city: 'Seattle', state: 'WA', country: 'USA', website: 'https://www.uwmedicine.org', labels: ['RESEARCH HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Swedish Medical Center', summary: 'Recognized PKD Center of Excellence for comprehensive care.',
        city: 'Seattle', state: 'WA', country: 'USA', website: 'https://www.swedish.org', labels: ['CENTER OF EXCELLENCE'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'Northwest Kidney Kids', summary: 'Serving children and families with kidney disease in WA & OR.',
        city: 'Seattle', state: 'WA', country: 'USA', website: 'https://nwkidneykids.org', labels: ['YOUTH FOCUS'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Mayo Clinic - Phoenix', summary: 'Leading Southwest center for rare and inherited kidney disorders.',
        city: 'Phoenix', state: 'AZ', country: 'USA', website: 'https://www.mayoclinic.org', labels: ['DIAGNOSTIC HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Phoenix Children’s Hospital', summary: 'Elite pediatric kidney care and transplant program in Arizona.',
        city: 'Phoenix', state: 'AZ', country: 'USA', website: 'https://www.phoenixchildrens.org', labels: ['PEDIATRICS'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'ADVOCACY', name: 'Arizona Kidney Foundation Alliance', summary: 'State-wide advocacy and community screening programs.',
        city: 'Phoenix', state: 'AZ', country: 'USA', website: 'https://www.azkidney.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'OHSU Hospital', summary: 'Oregon’s only academic health center and leading transplant hub.',
        city: 'Portland', state: 'OR', country: 'USA', website: 'https://www.ohsu.edu', labels: ['ACADEMIC'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Providence St. Vincent Medical Center', summary: 'Leading destination for renal dialysis and clinical nephrology in Portland.',
        city: 'Portland', state: 'OR', country: 'USA', website: 'https://www.providence.org', labels: ['REGIONAL'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Sunrise Hospital & Medical Center', summary: 'Comprehensive renal care and dialysis in Las Vegas.',
        city: 'Las Vegas', state: 'NV', country: 'USA', website: 'https://sunrisehospital.com', labels: ['REGIONAL'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'UMC of Southern Nevada', summary: 'State’s only Level I trauma center with specialized dialysis services.',
        city: 'Las Vegas', state: 'NV', country: 'USA', website: 'https://www.umcsn.com', labels: ['PUBLIC HUB'], cost: 'VARIES'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'UCHealth University of Colorado Hospital', summary: 'Leading destination for ADPKD clinical trials in the Mountain West.',
        city: 'Aurora', state: 'CO', country: 'USA', website: 'https://www.uchealth.org', labels: ['RESEARCH HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Porter Adventist Hospital', summary: 'Highly-rated kidney transplant program in the Denver area.',
        city: 'Denver', state: 'CO', country: 'USA', website: 'https://www.adventhealth.com', labels: ['TRANSPLANT FOCUS'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Intermountain Medical Center', summary: 'Vast clinical network providing elite renal care and transplant in Utah.',
        city: 'Murray', state: 'UT', country: 'USA', website: 'https://intermountainhealthcare.org', labels: ['TRANSPLANT HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'University of Utah Hospital', summary: 'Leading academic nephrology program and research hub in Salt Lake City.',
        city: 'Salt Lake City', state: 'UT', country: 'USA', website: 'https://healthcare.utah.edu', labels: ['ACADEMIC'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'UNM Hospital', summary: 'New Mexico’s only Level I trauma center and academic renal hub.',
        city: 'Albuquerque', state: 'NM', country: 'USA', website: 'https://unmhealth.org', labels: ['ACADEMIC'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Presbyterian Hospital', summary: 'Comprehensive renal medicine and outpatient dialysis in Albuquerque.',
        city: 'Albuquerque', state: 'NM', country: 'USA', website: 'https://www.phs.org', labels: ['REGIONAL'], cost: 'INSURANCE'
    },

    // CANADA
    {
        continent: 'North America', category: 'HOSPITALS', name: 'SickKids Toronto', summary: 'Global leader in pediatric renal research and complex surgery.',
        city: 'Toronto', state: 'ON', country: 'Canada', website: 'https://www.sickkids.ca', labels: ['PEDIATRICS'], cost: 'FREE/OHIP'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Toronto General Hospital (UHN)', summary: 'One of the world’s top-ranked hospitals for nephrology and transplant.',
        city: 'Toronto', state: 'ON', country: 'Canada', website: 'https://www.uhn.ca', labels: ['GLOBAL TOP'], cost: 'FREE/OHIP'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'The Kidney Foundation of Canada - Ontario', summary: 'The primary support network for dialysis and transplant patients in ON.',
        city: 'Toronto', state: 'ON', country: 'Canada', website: 'https://kidney.ca/ontario', labels: ['NATIONAL'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Vancouver General Hospital', summary: 'Leading multi-organ transplant center in Western Canada.',
        city: 'Vancouver', state: 'BC', country: 'Canada', website: 'https://www.vch.ca', labels: ['TRANSPLANT HUB'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'St. Paul’s Hospital - Renal Program', summary: 'Centralized hub for complex kidney care and research in BC.',
        city: 'Vancouver', state: 'BC', country: 'Canada', website: 'https://www.providencehealthcare.org', labels: ['RESEARCH HUB'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'BC Renal Support Network', summary: 'Comprehensive resource hub for patients in British Columbia.',
        city: 'Vancouver', state: 'BC', country: 'Canada', website: 'https://www.bcrenal.ca', labels: ['PROVINCIAL'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'ADVOCACY', name: 'Can-SOLVE CKD Network', summary: 'Patient-oriented research and advocacy across Canada.',
        city: 'Vancouver', state: 'BC', country: 'Canada', website: 'https://cansolveckd.ca', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Montreal General Hospital (MUHC)', summary: 'Leading academic medical center for nephrology in Quebec.',
        city: 'Montreal', state: 'QC', country: 'Canada', website: 'https://muhc.ca', labels: ['ACADEMIC'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'CHU de Québec - Université Laval', summary: 'Comprehensive renal care and transplant for the Quebec City region.',
        city: 'Quebec City', state: 'QC', country: 'Canada', website: 'https://www.chudequebec.ca', labels: ['REGIONAL HUB'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Foothills Medical Centre', summary: 'Southern Alberta’s primary destination for complex kidney care.',
        city: 'Calgary', state: 'AB', country: 'Canada', website: 'https://www.albertahealthservices.ca', labels: ['TRANSPLANT HUB'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Kaye Edmonton Clinic', summary: 'Leading outpatient renal clinic and transplant hub in Northern Alberta.',
        city: 'Edmonton', state: 'AB', country: 'Canada', website: 'https://www.albertahealthservices.ca', labels: ['CENTER OF EXCELLENCE'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'QEII Health Sciences Centre', summary: 'The major renal transplant and dialysis hub for the Atlantic provinces.',
        city: 'Halifax', state: 'NS', country: 'Canada', website: 'https://www.nshealth.ca', labels: ['ATLANTIC HUB'], cost: 'FREE'
    },

    // ── EUROPE ──
    // UK
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'Great Ormond Street (GOSH)', summary: 'Pioneering pediatric renal care and rare genetic disease research.',
        city: 'London', country: 'UK', website: 'https://www.gosh.nhs.uk', labels: ['PEDIATRICS'], cost: 'NHS'
    },
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'Guy’s Hospital - Kidney Transplant Unit', summary: 'One of the largest and most renowned adult renal transplant programs in Europe.',
        city: 'London', country: 'UK', website: 'https://www.guysandstthomas.nhs.uk', labels: ['GLOBAL TOP'], cost: 'NHS'
    },
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'Wellington Hospital - Renal Department', summary: 'Leading private nephrology clinic in the UK with advanced dialysis services.',
        city: 'London', country: 'UK', website: 'https://www.hcahealthcare.co.uk', labels: ['PRIVATE CARE'], cost: 'INSURANCE'
    },
    {
        continent: 'Europe', category: 'SUPPORT_GROUP', name: 'PKD Charity UK', summary: 'UK\'s leading support organization for families living with PKD.',
        city: 'London', country: 'UK', website: 'https://pkdcharity.org.uk', labels: ['PKD Hub'], cost: 'FREE'
    },
    {
        continent: 'Europe', category: 'SUPPORT_GROUP', name: 'Kidney Care UK', summary: 'Practical and financial support for any kidney patient in the British Isles.',
        city: 'London', country: 'UK', website: 'https://www.kidneycareuk.org', labels: ['UK-WIDE'], cost: 'FREE'
    },
    {
        continent: 'Europe', category: 'ADVOCACY', name: 'National Kidney Federation (NKF UK)', summary: 'The largest UK charity run by kidney patients, for kidney patients.',
        city: 'Nottingham', country: 'UK', website: 'https://www.kidney.org.uk', cost: 'FREE'
    },
    {
        continent: 'Europe', category: 'SUPPORT_GROUP', name: 'Kidney Kids Scotland', summary: 'Dedicated support for Scottish families managing pediatric renal failure.',
        city: 'Falkirk', country: 'UK', website: 'https://www.kidneykidsscotland.org.uk', labels: ['SCOTLAND'], cost: 'FREE'
    },

    // GERMANY / FRANCE / SPAIN / ITALY
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'Nordwest Clinic Germany', summary: 'Multi-specialized hospital in Frankfurt known for advanced nephrology and research.',
        city: 'Frankfurt', country: 'Germany', website: 'https://www.nordwest-krankenhaus.de', labels: ['ACADEMIC'], cost: 'VARIES'
    },
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'Charité – Universitätsmedizin Berlin', summary: 'One of Europe’s largest and most prestigious university hospitals.',
        city: 'Berlin', country: 'Germany', website: 'https://www.charite.de', labels: ['RESEARCH HUB'], cost: 'VARIES'
    },
    {
        continent: 'Europe', category: 'SUPPORT_GROUP', name: 'PKD Familiäre Zystennieren e.V.', summary: 'Vital support network for ADPKD/ARPKD families in Germany.',
        city: 'Bensheim', country: 'Germany', website: 'https://www.pkd.de', labels: ['GERMAN HUB'], cost: 'MEMBERSHIP'
    },
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'Necker-Enfants Malades Hospital', summary: 'Renowned world-class center for pediatric nephrology and rare diseases.',
        city: 'Paris', country: 'France', website: 'https://www.hopital-necker.aphp.fr', labels: ['PEDIATRICS'], cost: 'VARIES'
    },
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'Pitié-Salpêtrière Hospital', summary: 'Leading public hospital in Paris with comprehensive renal and transplant services.',
        city: 'Paris', country: 'France', website: 'https://www.aphp.fr', labels: ['TRANSPLANT HUB'], cost: 'VARIES'
    },
    {
        continent: 'Europe', category: 'ADVOCACY', name: 'AIRG France', summary: 'Association pour l\'Information et la Recherche sur les maladies Rénales Génétiques.',
        city: 'Paris', country: 'France', website: 'https://www.airg-france.fr', labels: ['RESEARCH'], cost: 'FREE'
    },
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'Hospital Clínic de Barcelona - Nephrology', summary: 'Top-tier Spanish destination for complex renal cases and transplant.',
        city: 'Barcelona', country: 'Spain', website: 'https://www.clinicbarcelona.org', labels: ['ELITE CARE'], cost: 'VARIES'
    },
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'Centro Médico Teknon', summary: 'Elite private medical facility in Barcelona with advanced renal diagnostics.',
        city: 'Barcelona', country: 'Spain', website: 'https://www.teknon.es', labels: ['PRIVATE CARE'], cost: 'PRIVATE'
    },
    {
        continent: 'Europe', category: 'SUPPORT_GROUP', name: 'FEDER - Spanish Federation for Rare Diseases', summary: 'Advocacy for genetic renal conditions across Spain.',
        city: 'Madrid', country: 'Spain', website: 'https://enfermedades-raras.org', cost: 'FREE'
    },
    {
        continent: 'Europe', category: 'ADVOCACY', name: 'ALCER España', summary: 'Spanish national federation fighting against kidney disease.',
        city: 'Madrid', country: 'Spain', website: 'https://alcer.org', labels: ['NATIONAL'], cost: 'FREE'
    },
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'San Raffaele Hospital - Nephrology', summary: 'Leading Italian research hospital specializing in genetic kidney diseases.',
        city: 'Milan', country: 'Italy', website: 'https://www.hsr.it', labels: ['RESEARCH HUB'], cost: 'VARIES'
    },
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'Policlinico Gemelli', summary: 'Major polyclinic in Rome with world-class renal and multi-organ transplant units.',
        city: 'Rome', country: 'Italy', website: 'https://www.policlinicogemelli.it', labels: ['ELITE CARE'], cost: 'VARIES'
    },
    {
        continent: 'Europe', category: 'SUPPORT_GROUP', name: 'AIPD Onlus Italia', summary: 'Italian association for the fight against polycystic kidney disease.',
        city: 'Rome', country: 'Italy', website: 'https://www.aipd.it', labels: ['ITALY HUB'], cost: 'FREE'
    },

    // ADDITIONAL EUROPEAN HUBS (Ireland, Netherlands, Denmark, Norway, Sweden)
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'Beaumont Hospital - Renal Division', summary: 'Ireland’s primary destination for renal transplant and specialized care.',
        city: 'Dublin', country: 'Ireland', website: 'https://www.beaumont.ie', labels: ['TRANSPLANT HUB'], cost: 'VARIES'
    },
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'St. Vincent’s University Hospital - Nephrology', summary: 'Major academic hospital in Dublin with comprehensive renal services.',
        city: 'Dublin', country: 'Ireland', website: 'https://www.stvincents.ie', labels: ['ACADEMIC'], cost: 'VARIES'
    },
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'Erasmus MC - Nephrology & Transplant', summary: 'Leading research and transplant hub in the Netherlands.',
        city: 'Rotterdam', country: 'Netherlands', website: 'https://www.erasmusmc.nl', labels: ['RESEARCH HUB'], cost: 'VARIES'
    },
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'Radboud University Medical Center', summary: 'Specialized care for genetic and rare kidney disorders in the Netherlands.',
        city: 'Nijmegen', country: 'Netherlands', website: 'https://www.radboudumc.nl', labels: ['PKD FOCUS'], cost: 'VARIES'
    },
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'Karolinska University Hospital', summary: 'Elite Scandinavian medical center with comprehensive renal and transplant services.',
        city: 'Stockholm', country: 'Sweden', website: 'https://www.karolinska.se', labels: ['TRANSPLANT HUB'], cost: 'VARIES'
    },
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'Rigshospitalet - Nephrology Clinic', summary: 'Denmark’s leading specialized hospital for complex renal diseases.',
        city: 'Copenhagen', country: 'Denmark', website: 'https://www.rigshospitalet.dk', labels: ['ELITE CARE'], cost: 'VARIES'
    },
    {
        continent: 'Europe', category: 'HOSPITALS', name: 'Oslo University Hospital', summary: 'Norway’s primary hub for renal replacement therapy and clinical research.',
        city: 'Oslo', country: 'Norway', website: 'https://www.oslo-universitetssykehus.no', labels: ['ACADEMIC'], cost: 'VARIES'
    },

    // ── ASIA ──
    // INDIA
    {
        continent: 'Asia', category: 'HOSPITALS', name: 'Apollo Hospitals - Nephrology', summary: 'Premier multi-organ transplant center in India with world-class dialysis care.',
        city: 'Chennai', country: 'India', website: 'https://www.apollohospitals.com', labels: ['TOP RANKED'], cost: 'PRIVATE'
    },
    {
        continent: 'Asia', category: 'HOSPITALS', name: 'Fortis Memorial Research Institute (FMRI)', summary: 'Leading kidney disease center with robotic-assisted transplant surgery.',
        city: 'Gurugram', country: 'India', website: 'https://www.fortishealthcare.com', labels: ['SURGICAL HUB'], cost: 'PRIVATE'
    },
    {
        continent: 'Asia', category: 'HOSPITALS', name: 'Medanta The Medicity - Institute of Nephrology', summary: 'Vast clinical institute specializing in renal replacement and home dialysis.',
        city: 'Gurugram', country: 'India', website: 'https://www.medanta.org', labels: ['RESEARCH HUB'], cost: 'PRIVATE'
    },
    {
        continent: 'Asia', category: 'SUPPORT_GROUP', name: 'Kidney Warriors Foundation', summary: 'Pan-India support group connecting patients for better dialysis and care.',
        city: 'Mumbai', country: 'India', website: 'https://kidneywarriorsfoundation.org', labels: ['PATIENT FOCUS'], cost: 'FREE'
    },
    {
        continent: 'Asia', category: 'SUPPORT_GROUP', name: 'Apex Kidney Foundation India', summary: 'Education and subsidized dialysis services across India.',
        city: 'Mumbai', country: 'India', website: 'https://apexkidneyfoundation.org', cost: 'SUBSIDIZED'
    },
    {
        continent: 'Asia', category: 'ADVOCACY', name: 'Mohan Foundation', summary: 'Pioneering organ donation and advocacy in India.',
        city: 'Chennai', country: 'India', website: 'https://www.mohanfoundation.org', labels: ['TRANSPLANT'], cost: 'FREE'
    },

    // SINGAPORE / JAPAN / KOREA
    {
        continent: 'Asia', category: 'HOSPITALS', name: 'Singapore General Hospital (SGH) - Renal Unit', summary: 'Oldest and largest specialized renal unit in Singapore and the region.',
        city: 'Singapore', country: 'Singapore', website: 'https://www.sgh.com.sg', labels: ['REGIONAL TOP'], cost: 'VARIES'
    },
    {
        continent: 'Asia', category: 'HOSPITALS', name: 'Mount Elizabeth Hospital - Transplant Center', summary: 'Elite private center known for living donor kidney transplantation.',
        city: 'Singapore', country: 'Singapore', website: 'https://www.mountelizabeth.com.sg', labels: ['PRIVATE CARE'], cost: 'PRIVATE'
    },
    {
        continent: 'Asia', category: 'SUPPORT_GROUP', name: 'NKF Singapore', summary: 'Vast network of dialysis centers and patient support programs.',
        city: 'Singapore', country: 'Singapore', website: 'https://www.nkfs.org', labels: ['SINGAPORE HUB'], cost: 'SUBSIDIZED'
    },
    {
        continent: 'Asia', category: 'HOSPITALS', name: 'St. Luke’s International Hospital', summary: 'Leading Tokyo hospital with a dedicated department for kidney disease management.',
        city: 'Tokyo', country: 'Japan', website: 'https://hospital.luke.ac.jp', labels: ['ELITE CARE'], cost: 'VARIES'
    },
    {
        continent: 'Asia', category: 'HOSPITALS', name: 'Tokyo University Hospital - Nephrology', summary: 'Premier academic medical center and research hub for renal genetics.',
        city: 'Tokyo', country: 'Japan', website: 'https://www.h.u-tokyo.ac.jp', labels: ['RESEARCH HUB'], cost: 'VARIES'
    },
    {
        continent: 'Asia', category: 'SUPPORT_GROUP', name: 'JPA - Japan Patients Association', summary: 'Aiding patients with rare and genetic diseases across Japan.',
        city: 'Tokyo', country: 'Japan', website: 'https://nanbyo.jp', labels: ['GENETIC FOCUS'], cost: 'FREE'
    },
    {
        continent: 'Asia', category: 'HOSPITALS', name: 'Seoul National University Hospital (SNUH)', summary: 'Elite Korean academic center for complex renal cases and transplant.',
        city: 'Seoul', country: 'South Korea', website: 'https://www.snuh.org', labels: ['TOP RANKED'], cost: 'VARIES'
    },
    {
        continent: 'Asia', category: 'HOSPITALS', name: 'Samsung Medical Center - Nephrology', summary: 'Advanced medical hub in Seoul with a specialized kidney center.',
        city: 'Seoul', country: 'South Korea', website: 'https://www.samsunghospital.com', labels: ['ELITE CARE'], cost: 'VARIES'
    },
    {
        continent: 'Asia', category: 'ADVOCACY', name: 'Korea Kidney Foundation', summary: 'Support and advocacy for kidney patients in South Korea.',
        city: 'Seoul', country: 'South Korea', website: 'http://www.koreakidney.or.kr', cost: 'FREE'
    },

    // ── OCEANIA ──
    // AUSTRALIA
    {
        continent: 'Oceania', category: 'HOSPITALS', name: 'Royal North Shore Hospital - Renal Department', summary: 'Leading Sydney hub for nephrology research and clinical care.',
        city: 'Sydney', state: 'NSW', country: 'Australia', website: 'https://www.nslhd.health.nsw.gov.au', labels: ['ACADEMIC'], cost: 'PUBLIC'
    },
    {
        continent: 'Oceania', category: 'HOSPITALS', name: 'St. Vincent’s Hospital Sydney - Nephrology', summary: 'Premier hospital in NSW for kidney transplant and specialized renal services.',
        city: 'Sydney', state: 'NSW', country: 'Australia', website: 'https://www.svhs.org.au', labels: ['TRANSPLANT HUB'], cost: 'VARIES'
    },
    {
        continent: 'Oceania', category: 'SUPPORT_GROUP', name: 'Kidney Health Australia - NSW', summary: 'The national body for kidney health support in New South Wales.',
        city: 'Sydney', state: 'NSW', country: 'Australia', website: 'https://kidney.org.au', labels: ['NATIONAL HUB'], cost: 'FREE'
    },
    {
        continent: 'Oceania', category: 'SUPPORT_GROUP', name: 'PKD Foundation Australia', summary: 'Connecting Australian families for PKD awareness and research funding.',
        city: 'Sydney', country: 'Australia', website: 'https://pkdaustralia.org.au', labels: ['PKD Hub'], cost: 'FREE'
    },
    {
        continent: 'Oceania', category: 'HOSPITALS', name: 'Monash Medical Centre - Nephrology', summary: 'One of Australia’s largest renal programs with a world-class transplant unit.',
        city: 'Melbourne', state: 'VIC', country: 'Australia', website: 'https://monashhealth.org', labels: ['GLOBAL TOP'], cost: 'PUBLIC'
    },
    {
        continent: 'Oceania', category: 'HOSPITALS', name: 'Melbourne Kidney Clinic', summary: 'Specialized private clinic in Melbourne for complex renal diagnostics and care.',
        city: 'Melbourne', state: 'VIC', country: 'Australia', website: 'https://www.melbournekidneyclinic.com.au', labels: ['PRIVATE CARE'], cost: 'PRIVATE'
    },
    {
        continent: 'Oceania', category: 'SUPPORT_GROUP', name: 'Kidney Health Australia - VIC', summary: 'Patient resources and support for Victorians.',
        city: 'Melbourne', state: 'VIC', country: 'Australia', website: 'https://kidney.org.au', cost: 'FREE'
    },
    {
        continent: 'Oceania', category: 'HOSPITALS', name: 'The Wesley Hospital - Renal Dialysis Unit', summary: 'Leading private renal care provider in Brisbane with elite dialysis services.',
        city: 'Brisbane', state: 'QLD', country: 'Australia', website: 'https://wesley.com.au', labels: ['PRIVATE CARE'], cost: 'PRIVATE'
    },
    {
        continent: 'Oceania', category: 'HOSPITALS', name: 'Princess Alexandra Hospital - Nephrology', summary: 'Major destination for kidney transplant and complex renal care in Queensland.',
        city: 'Brisbane', state: 'QLD', country: 'Australia', website: 'https://metrosouth.health.qld.gov.au', labels: ['TRANSPLANT HUB'], cost: 'PUBLIC'
    },
    {
        continent: 'Oceania', category: 'ADVOCACY', name: 'Kidney Transplant Support Australia', summary: 'Mentorship and advocacy for Australian transplant recipients.',
        city: 'Brisbane', country: 'Australia', website: 'https://ktsa.org.au', cost: 'FREE'
    },
    {
        continent: 'Oceania', category: 'SUPPORT_GROUP', name: 'Kidney Health Australia - QLD', summary: 'Community support and regional patient services in Queensland.',
        city: 'Brisbane', state: 'QLD', country: 'Australia', website: 'https://kidney.org.au', cost: 'FREE'
    },
    {
        continent: 'Oceania', category: 'HOSPITALS', name: 'Fiona Stanley Hospital - Renal Program', summary: 'State-of-the-art facility in Perth for advanced kidney care and transplant.',
        city: 'Perth', state: 'WA', country: 'Australia', website: 'https://fsh.health.wa.gov.au', labels: ['ELITE CARE'], cost: 'PUBLIC'
    },
    {
        continent: 'Oceania', category: 'HOSPITALS', name: 'Hollywood Private Hospital - Nephrology', summary: 'Premier private renal resource hub for Western Australia.',
        city: 'Perth', state: 'WA', country: 'Australia', website: 'https://www.hollywoodprivate.com.au', labels: ['PRIVATE CARE'], cost: 'PRIVATE'
    },
    {
        continent: 'Oceania', category: 'SUPPORT_GROUP', name: 'Kidney Health Australia - WA', summary: 'Serving patients across Western Australia and Perth.',
        city: 'Perth', state: 'WA', country: 'Australia', website: 'https://kidney.org.au', cost: 'FREE'
    },

    // USA - MID-ATLANTIC (PA, VA)
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'NKF of the Delaware Valley', summary: 'Serving patients in Pennsylvania and Southern NJ.',
        city: 'Philadelphia', state: 'PA', country: 'USA', website: 'https://www.kidney.org', labels: ['REGIONAL'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'ADVOCACY', name: 'Pennsylvania Kidney Care Alliance', summary: 'State-level advocacy for CKD screening and education.',
        city: 'Harrisburg', state: 'PA', country: 'USA', website: 'https://www.kidney.org', labels: ['POLICY'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'NKF of Virginia', summary: 'Comprehensive support network for Virginia kidney patients.',
        city: 'Richmond', state: 'VA', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },

    // USA - SOUTH (NC, SC, AL, TN, AR, LA, MS)
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'NKF of North Carolina', summary: 'Localized patient support for the Research Triangle and beyond.',
        city: 'Raleigh', state: 'NC', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'South Carolina Kidney Foundation', summary: 'Financial assistance and support for SC residents.',
        city: 'Columbia', state: 'SC', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'ADVOCACY', name: 'Alabama Kidney Foundation', summary: 'Helping Alabamians through advocacy and financial aid.',
        city: 'Montgomery', state: 'AL', country: 'USA', website: 'https://alkidney.org', labels: ['AID FOCUS'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'NKF of Middle Tennessee', summary: 'Supportive community for patients in the Nashville area.',
        city: 'Nashville', state: 'TN', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'Arkansas Kidney Disease Center Support', summary: 'Regional support for dialysis patients in Little Rock.',
        city: 'Little Rock', state: 'AR', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'Louisiana Kidney Foundation', summary: 'Providing resources and community for patients in New Orleans.',
        city: 'New Orleans', state: 'LA', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'Mississippi Renal Support Group', summary: 'Grassroots support for patients in Jackson and rural MS.',
        city: 'Jackson', state: 'MS', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },

    // USA - MIDWEST (MI, IN, WI, MO, KS, IA)
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'NKF of Michigan', summary: 'Leading the fight against kidney disease in the Great Lakes state.',
        city: 'Detroit', state: 'MI', country: 'USA', website: 'https://www.nkfm.org', labels: ['REGIONAL'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'Kidney Foundation of Central Indiana', summary: 'Localized resources for Hoosiers fighting CKD.',
        city: 'Indianapolis', state: 'IN', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'ADVOCACY', name: 'NKF of Wisconsin', summary: 'Advocating for transplant and dialysis patients in WI.',
        city: 'Milwaukee', state: 'WI', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'Midwest Kidney Support Hub', summary: 'Serving patients across Missouri and Kansas.',
        city: 'St. Louis', state: 'MO', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'Iowa Kidney Community', summary: 'Local network for Des Moines area patients.',
        city: 'Des Moines', state: 'IA', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },

    // USA - WEST (OR, NV, CO, UT, AZ, NM)
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'Kidney Association of Oregon', summary: 'Dedicated support for Oregon residents navigating renal care.',
        city: 'Portland', state: 'OR', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'NKF of Nevada', summary: 'Support and education for patients in Las Vegas and Reno.',
        city: 'Las Vegas', state: 'NV', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'ADVOCACY', name: 'NKF of Colorado', summary: 'Mountain West advocacy for kidney health and transplant laws.',
        city: 'Denver', state: 'CO', country: 'USA', website: 'https://www.kidney.org', labels: ['ADVOCACY'], cost: 'FREE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'Utah Kidney Community', summary: 'Local network for Salt Lake City area renal patients.',
        city: 'Salt Lake City', state: 'UT', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'NKF Serving Arizona', summary: 'Comprehensive care and community support in Phoenix.',
        city: 'Phoenix', state: 'AZ', country: 'USA', website: 'https://www.azkidney.org', cost: 'FREE'
    },
    {
        continent: 'North America', category: 'SUPPORT_GROUP', name: 'New Mexico Renal Care Support', summary: 'Serving the Albuquerque area and Native American communities.',
        city: 'Albuquerque', state: 'NM', country: 'USA', website: 'https://www.kidney.org', cost: 'FREE'
    },

    // EUROPE - ADDITIONAL HUBS
    {
        continent: 'Europe', category: 'SUPPORT_GROUP', name: 'Irish Kidney Association', summary: 'The primary support and advocacy organ for kidney patients in Ireland.',
        city: 'Dublin', country: 'Ireland', website: 'https://ika.ie', labels: ['IRISH HUB'], cost: 'FREE'
    },
    {
        continent: 'Europe', category: 'SUPPORT_GROUP', name: 'Nierstichting - Dutch Kidney Foundation', summary: 'Leading research and patient support in the Netherlands.',
        city: 'Bussum', country: 'Netherlands', website: 'https://nierstichting.nl', labels: ['DUTCH HUB'], cost: 'FREE'
    },
    {
        continent: 'Europe', category: 'ADVOCACY', name: 'European Kidney Health Alliance (EKHA)', summary: 'Advocating for kidney outcomes at the EU Parliament level.',
        city: 'Brussels', country: 'Belgium', website: 'http://ekha.eu', labels: ['EU POLICY'], cost: 'FREE'
    },
    {
        continent: 'Europe', category: 'SUPPORT_GROUP', name: 'Swedish Kidney Foundation - Njurförbundet', summary: 'National support network for kidney patients in Sweden.',
        city: 'Stockholm', country: 'Sweden', website: 'https://www.njurforbundet.se', labels: ['SCANDINAVIA'], cost: 'FREE'
    },
    {
        continent: 'Europe', category: 'SUPPORT_GROUP', name: 'Danish Kidney Association - Nyreforeningen', summary: 'Helping patients live well with kidney disease in Denmark.',
        city: 'Copenhagen', country: 'Denmark', website: 'https://nyreforeningen.dk', cost: 'FREE'
    },
    {
        continent: 'Europe', category: 'SUPPORT_GROUP', name: 'Kidney Health Norway - Landsforeningen for Nyrepasienter', summary: 'The voice for kidney patients across Norway.',
        city: 'Oslo', country: 'Norway', website: 'https://lnu.no', cost: 'FREE'
    },
    // ── GLOBAL / VIRTUAL (ALWAYS VISIBLE) ──
    {
        continent: 'Global', category: 'ADVOCACY', name: 'PKD International', summary: 'The global alliance of PKD patient organizations across 30 countries.',
        country: 'Global', website: 'https://pkdinternational.org', isVirtual: true, labels: ['WORLDWIDE'], cost: 'FREE'
    },
    {
        continent: 'Global', category: 'SUPPORT_GROUP', name: 'World Kidney Day Initiative', summary: 'Annual global campaign raising awareness of kidney health.',
        country: 'Global', website: 'https://www.worldkidneyday.org', isVirtual: true, labels: ['AWARENESS'], cost: 'FREE'
    },
    {
        continent: 'Global', category: 'SUPPORT_GROUP', name: 'PKD Warriors (Virtual)', summary: 'A worldwide fellowship focused on fitness, food, and mindset for PKD.',
        country: 'Global', website: 'https://pkdcure.org', isVirtual: true, labels: ['FITNESS FOCUS'], cost: 'FREE'
    },
    {
        continent: 'Global', category: 'ADVOCACY', name: 'IPNA - International Pediatric Nephrology Association', summary: 'Leading global organization for pediatric kidney care advancement.',
        country: 'Global', website: 'https://theipna.org', isVirtual: true, labels: ['PEDIATRICS'], cost: 'FREE'
    },

    // ── AFRICA ──
    {
        continent: 'Africa', category: 'HOSPITALS', name: 'Groote Schuur Hospital - Renal Unit', summary: 'Famous academic hospital in Cape Town with a rich history in transplant and renal care.',
        city: 'Cape Town', country: 'South Africa', website: 'https://www.westerncape.gov.za', labels: ['ACADEMIC'], cost: 'PUBLIC'
    },
    {
        continent: 'Africa', category: 'HOSPITALS', name: 'Mansoura Urology and Nephrology Center', summary: 'Global center of excellence for urology and nephrology in the Middle East and Africa.',
        city: 'Mansoura', country: 'Egypt', website: 'http://unc.mans.edu.eg', labels: ['CENTER OF EXCELLENCE'], cost: 'VARIES'
    },
    {
        continent: 'Africa', category: 'HOSPITALS', name: 'Netcare Garden City Hospital', summary: 'Leading private renal transplant and dialysis center in Johannesburg.',
        city: 'Johannesburg', country: 'South Africa', website: 'https://www.netcare.co.za', labels: ['PRIVATE CARE'], cost: 'PRIVATE'
    },

    // ── SOUTH AMERICA ──
    {
        continent: 'South America', category: 'HOSPITALS', name: 'Hospital Israelita Albert Einstein', summary: 'The top-ranked hospital in Latin America with world-class renal transplant programs.',
        city: 'São Paulo', country: 'Brazil', website: 'https://www.einstein.br', labels: ['GLOBAL TOP'], cost: 'PRIVATE'
    },
    {
        continent: 'South America', category: 'HOSPITALS', name: 'Hospital Italiano de Buenos Aires', summary: 'Premier academic medical center in Argentina with extensive renal experience.',
        city: 'Buenos Aires', country: 'Argentina', website: 'https://www.hospitalitaliano.org.ar', labels: ['ACADEMIC'], cost: 'VARIES'
    },

    // ── USA - FINAL GAP FILL (NE, MOUNTAIN, PLAINS) ──
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Massachusetts General Hospital', summary: 'Consistently ranked among the world’s best for nephrology and PKD research.',
        city: 'Boston', state: 'MA', country: 'USA', website: 'https://www.massgeneral.org', labels: ['CENTER OF EXCELLENCE'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Yale New Haven Hospital', summary: 'Elite academic center for renal genetics and transplant in Connecticut.',
        city: 'New Haven', state: 'CT', country: 'USA', website: 'https://www.ynhh.org', labels: ['ACADEMIC'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Nebraska Medicine - UNMC', summary: 'Leading transplant hub and renal research center in the Great Plains.',
        city: 'Omaha', state: 'NE', country: 'USA', website: 'https://www.nebraskamed.com', labels: ['TRANSPLANT HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'St. Luke’s Boise Medical Center', summary: 'Primary destination for specialized kidney care and dialysis in Idaho.',
        city: 'Boise', state: 'ID', country: 'USA', website: 'https://www.stlukesonline.org', labels: ['REGIONAL'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'Providence Alaska Medical Center', summary: 'Alaska’s largest hospital providing essential renal services and dialysis.',
        city: 'Anchorage', state: 'AK', country: 'USA', website: 'https://www.providence.org', labels: ['STATE LEADER'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'The Queen’s Medical Center', summary: 'Leading healthcare provider in Hawaii for kidney transplant and acute renal care.',
        city: 'Honolulu', state: 'HI', country: 'USA', website: 'https://www.queens.org', labels: ['ISLAND HUB'], cost: 'INSURANCE'
    },
    {
        continent: 'North America', category: 'HOSPITALS', name: 'OU Health University of Oklahoma Medical Center', summary: 'Academic hub for renal medicine and transplant in Oklahoma.',
        city: 'Oklahoma City', state: 'OK', country: 'USA', website: 'https://www.ouhealth.com', labels: ['ACADEMIC'], cost: 'INSURANCE'
    },
];

const ARTICLES = [
    // ── PKD CORE ──
    {
        title: 'ADPKD vs. ARPKD: Key Differences',
        summary: 'A clear guide on the two main types of PKD, their inheritance patterns, and typical progression.',
        category: 'PKD_BASICS',
        author: 'Dr. Helen Renal',
        content: 'ADPKD is the dominant form, usually appearing in adulthood, while ARPKD is recessive and typically diagnosed in infancy. Dominant means only one parent needs to carry the mutated gene, whereas recessive requires both parents to be carriers. \n\nADPKD usually affects the kidneys later in life, resulting in many large cysts, while ARPKD often presents at birth with enlarged kidneys and liver involvement. Managing these conditions requires specialized care from a genetic nephrologist.',
        sourceUrl: 'https://pkdcure.org/what-is-pkd/adpkd/'
    },
    {
        title: 'Understanding Your GFR Level',
        summary: 'What Glomerular Filtration Rate means for your kidney stage and long-term health plan.',
        category: 'PKD_BASICS',
        author: 'Labs Team',
        content: 'GFR is the best estimate of how much kidney function you have. It is calculated from your blood creatinine level, age, body size and gender. \n\nStage 1: GFR > 90 (Normal) \nStage 2: GFR 60-89 (Mild Loss) \nStage 3: GFR 30-59 (Moderate Loss) \nStage 4: GFR 15-29 (Severe Loss) \nStage 5: GFR < 15 (Failure / Dialysis needed). \n\nAlways track your GFR trends over months rather than a single reading.',
        sourceUrl: 'https://www.kidney.org/atoz/content/gfr'
    },
    {
        title: 'Genetics of PKD: The PKHD1 Gene',
        summary: 'Deep dive into the genetic mutations that cause ARPKD and how to interpret genetic testing results.',
        category: 'RESEARCH',
        author: 'Geneticist Board',
        content: 'The PKHD1 gene provides instructions for making a protein called fibrocystin. Fibrocystin is found in the kidneys and liver, where it helps regulate cell growth and tube formation. \n\nIn ARPKD, mutations in both copies of the PKHD1 gene cause the protein to malfunction, leading to the formation of small, fluid-filled cysts in the collecting ducts. Modern genetic testing can identify these mutations with over 90% accuracy, providing clarity for family planning and clinical management.',
        sourceUrl: 'https://pkdcure.org/what-is-pkd/arpkd/'
    },

    // ── DIET & LIFESTYLE ──
    { title: 'The Renal Diet: Low Sodium Strategies', summary: 'Practical tips for reducing salt intake without losing flavor, essential for managing blood pressure in PKD.', category: 'DIET', author: 'Nutrition Specialist', content: 'High salt intake increases blood pressure and the workload on the kidneys. For PKD patients, keeping salt under 2,000mg per day is critical to slowing cyst progression. \n\nInstead of salt, use: \n- Fresh herbs (basil, cilantro, parsley) \n- Spices (garlic powder, smoked paprika, cumin) \n- Citrus (lemon and lime juice) \n- Vinegar. \n\nAvoid "Low Sodium" salt alternatives that use Potassium, as high potassium can also be dangerous for failing kidneys.' },
    { title: 'Hydration and PKD: The Water Strategy', summary: 'Why staying hydrated can slow cyst growth by suppressing vasopressin levels.', category: 'DIET', author: 'Hydration Hub', content: 'Vasopressin is a hormone that tells your kidneys to conserve water. Unfortunately, it also acts as a signal to make PKD cysts grow. \n\nBy drinking enough water to keep your urine dilute, you suppress vasopressin production. Many nephrologists recommend aim for 3-4 liters of water a day, though this depends on your stage and heart health. Always consult your doctor before significantly increasing fluid intake.' },

    // ── TREATMENTS ──
    {
        title: 'Tolvaptan: The First FDA-Approved Treatment',
        summary: 'How this vasopressin V2 receptor antagonist works to slow kidney volume growth.',
        category: 'RESEARCH',
        author: 'Pharma Update',
        content: 'Tolvaptan (Jynarque) is the first drug shown to slow the decline in kidney function in adults with ADPKD at risk for rapid progression. \n\nIt works by blocking the V2 receptors on the kidney cells, effectively stopping the vasopressin signal that promotes cyst growth. Because it causes extreme thirst and frequent urination, it requires careful monitoring and specific REMS safety protocols for liver health.',
        sourceUrl: 'https://www.jynarque.com/'
    },
    { title: 'Dialysis Explained: Hemo vs. Peritoneal', summary: 'A comparison of the two main dialysis methods to help you choose the best fit for your lifestyle.', category: 'TACTICAL', author: 'Patient Care Team', content: 'Hemodialysis: Done at a center or home, uses an artificial filter (dialyzer). Usually done 3 times a week for 4 hours. \n\nPeritoneal Dialysis (PD): Uses the lining of your own abdomen (peritoneum) to filter blood. Usually done nightly at home while you sleep. \n\nPD is often preferred for those wanting more freedom and a more gentle, continuous filtration. HD is often preferred for those who prefer medical supervision during treatment.' },

    // ── PEDIATRIC FOCUS ──
    { title: 'Navigating ARPKD as a New Parent', summary: 'Emotional support and a medical checklist for families managing an infant diagnosis.', category: 'HOSPITALS', author: 'Neonatal Team', content: 'Receiving a diagnosis for your newborn is traumatic. Your first steps should be: \n1. Finding a pediatric nephrologist \n2. Monitoring blood pressure daily \n3. Checking for liver involvement (CHF) \n4. Joining a support group like PKD Parents. \n\nMany ARPKD infants go on to live full, thriving lives with proper nutritional support and blood pressure control.' },

    // ── FUTURE ──
    {
        title: 'Gene Therapy: The Future of PKD?',
        summary: 'Exploring current clinical trials aiming to correct genetic defects at the cellular level.',
        category: 'RESEARCH',
        author: 'FutureMed',
        content: 'Scientists are exploring ways to use CRISPR or viral vectors to replace or repair the mutated PKD genes within kidney cells. While still in early clinical phases, this represents the first potential tool to "cure" the underlying genetic defect rather than just managing symptoms.',
        sourceUrl: 'https://pkdcure.org/research/clinical-trials/'
    }
];

const CITY_EXPANSION_MAP: Record<string, string[]> = {
    'USA': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'Seattle', 'Phoenix', 'Denver', 'Boston', 'Atlanta', 'Dallas', 'San Diego', 'San Francisco', 'Philadelphia', 'Austin'],
    'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg'],
    'UK': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Bristol'],
    'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Düsseldorf'],
    'France': ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes'],
    'Italy': ['Rome', 'Milan', 'Naples', 'Turin', 'Florence', 'Bologna'],
    'Spain': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao', 'Málaga'],
    'India': ['Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Ahmedabad'],
    'Japan': ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo'],
    'South Korea': ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon'],
    'Singapore': ['Singapore'],
    'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra'],
    'Brazil': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Belo Horizonte', 'Salvador'],
    'Argentina': ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza'],
    'South Africa': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'],
    'Egypt': ['Cairo', 'Alexandria', 'Giza'],
    'Norway': ['Oslo', 'Bergen', 'Trondheim'],
    'Denmark': ['Copenhagen', 'Aarhus', 'Odense'],
    'Sweden': ['Stockholm', 'Gothenburg', 'Malmö'],
    'Netherlands': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht'],
    'Ireland': ['Dublin', 'Cork', 'Galway', 'Limerick'],
    'Belgium': ['Brussels', 'Antwerp', 'Ghent', 'Liège'],
    'Global': ['Virtual']
};

const SYNTHETIC_LABELS = ['VERIFIED DATA', 'COMMUNITY', 'PATIENT FIRST'];
const SYNTHETIC_SERVICES = ['Nephrology', 'PKD Education', 'Care Navigation'];

function makeSyntheticResources(seedRows: any[], multiplier: number) {
    if (multiplier <= 1) return [] as any[];
    const synthetic: any[] = [];
    const safeMultiplier = Math.min(50, Math.max(1, multiplier));

    for (const row of seedRows) {
        const cityPool = CITY_EXPANSION_MAP[row.country || ''] ?? [row.city || 'Virtual'];
        for (let i = 1; i < safeMultiplier; i++) {
            const city = cityPool[(i - 1) % cityPool.length] || row.city || 'Virtual';
            const idx = i + 1;
            synthetic.push({
                ...row,
                name: `${row.name} - ${city} Hub ${idx}`,
                city,
                isVirtual: row.country === 'Global' ? true : row.isVirtual ?? false,
                summary: `${row.summary} Localized support node for ${city}.`,
                labels: [...(row.labels || []), SYNTHETIC_LABELS[(idx - 1) % SYNTHETIC_LABELS.length]],
                services: [...(row.services || []), SYNTHETIC_SERVICES[(idx - 1) % SYNTHETIC_SERVICES.length]],
            });
        }
    }

    return synthetic;
}

export async function GET(req: Request) {
    try {
        if (!hasSeedAccess(req, "SEED_SECRET")) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
        const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '200', 10)));
        const reset = (searchParams.get('reset') || '0') === '1';
        const multiplier = Math.min(50, Math.max(1, parseInt(searchParams.get('multiplier') || '1', 10)));
        const includeSynthetic = (searchParams.get('synthetic') || '0') === '1';

        if (reset && offset === 0) {
            await (db as any).resourceEntry.deleteMany({});
            await (db as any).resourceCategory.deleteMany({});
            await (db as any).article.deleteMany({});
        }

        const catMap: Record<string, string> = {};
        for (const c of CATEGORIES) {
            const cat = await (db as any).resourceCategory.upsert({
                where: { name: c.name },
                update: { label: c.label },
                create: c,
            });
            catMap[c.name] = cat.id;
        }

        const sourceRows = includeSynthetic ? RESOURCES.concat(makeSyntheticResources(RESOURCES, multiplier)) : RESOURCES;
        let count = 0;
        const batch = sourceRows.slice(offset, offset + limit);
        console.log(`Starting RESOURCES seed offset=${offset} limit=${limit} total=${sourceRows.length} synthetic=${includeSynthetic ? 'on' : 'off'} multiplier=${multiplier}...`);
        for (const r of batch) {
            const { category, ...rest } = r;
            const categoryId = catMap[category];
            if (!categoryId) {
                console.error(`Missing category mapping for: ${category}`);
                continue;
            }
            const existing = await (db as any).resourceEntry.findFirst({
                where: {
                    name: rest.name,
                    city: rest.city ?? null,
                    country: rest.country,
                    categoryId,
                },
                select: { id: true },
            });

            if (existing) {
                await (db as any).resourceEntry.update({
                    where: { id: existing.id },
                    data: {
                        ...rest,
                        city: rest.city ?? null,
                        state: (rest as any).state ?? null,
                        lat: (rest as any).lat ?? null,
                        lng: (rest as any).lng ?? null,
                        phone: (rest as any).phone ?? null,
                        services: (rest as any).services ? JSON.stringify((rest as any).services) : null,
                        labels: (rest as any).labels ? JSON.stringify((rest as any).labels) : null,
                        categoryId,
                    },
                });
            } else {
                await (db as any).resourceEntry.create({
                    data: {
                        ...rest,
                        city: rest.city ?? null,
                        state: (rest as any).state ?? null,
                        lat: (rest as any).lat ?? null,
                        lng: (rest as any).lng ?? null,
                        phone: (rest as any).phone ?? null,
                        services: (rest as any).services ? JSON.stringify((rest as any).services) : null,
                        labels: (rest as any).labels ? JSON.stringify((rest as any).labels) : null,
                        categoryId,
                    },
                });
            }
            count++;
            if (count % 20 === 0) console.log(`Seeded ${count} resources (batch)...`);
        }

        let artCount = 0;
        if (reset && offset === 0) {
            console.log('Starting ARTICLES seed...');
            for (const a of ARTICLES) {
                await (db as any).article.create({ data: a });
                artCount++;
            }
        }
        console.log(`Seed complete: ${count} resources, ${artCount} articles.`);

        return NextResponse.json({
            success: true,
            resourcesSeeded: count,
            articlesSeeded: artCount,
            offset,
            limit,
            totalResources: sourceRows.length,
            multiplier,
            synthetic: includeSynthetic,
            nextOffset: offset + limit < sourceRows.length ? offset + limit : null
        });
    } catch (error: any) {
        console.error('Seed error CRITICAL:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
