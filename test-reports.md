# Testing Checklist - Professional Reports

## Setup
- [ ] Run: node scripts/make-admin.js YOUR_EMAIL admin
- [ ] Login to the app
- [ ] Verify you can access /dashboard/consultas

## Create Test Data
- [ ] Go to /dashboard/consultas
- [ ] Select a child profile
- [ ] Enter sample transcript
- [ ] Generate AI analysis
- [ ] Note the consultation ID

## Test Report Editing
- [ ] Access /dashboard/reports/professional?consultaId=ID
- [ ] Verify all 5 tabs load correctly
- [ ] Edit analysis text
- [ ] Add professional notes
- [ ] Configure follow-up
- [ ] Set privacy settings
- [ ] Save changes (creates version 2)

## Test Approval Flow
- [ ] Click "Approve" button
- [ ] Verify status changes to "approved"
- [ ] Check that edit button is disabled
- [ ] Verify privacy settings are applied

## Test Parent View (optional)
- [ ] Login as parent account
- [ ] Try to access the approved report
- [ ] Verify they can only view (not edit)
- [ ] Check download permission works
