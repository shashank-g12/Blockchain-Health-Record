/**
 * Transaction for creating tests available for the day.
 * @param {org.ehr.basic.CreateTests} tests - The sample transaction instance.
 * @transaction
 */ 

async function create(tests) {
  for(let n = 0 ; n < tests.id.length; n++) {
  	var test1 = getFactory().newResource('org.ehr.basic', 'Tests', tests.id[n]);
    
    test1.price = tests.price[n];
    test1.description = tests.description[n];
    let assetRegistry = await getAssetRegistry('org.ehr.basic.Tests');
    await assetRegistry.add(test1);
  }
}

/**
 * Transaction for creating appointment between doctor and patient.
 * @param {org.ehr.basic.CreateAppointment} app - The sample transaction instance.
 * @transaction
 */  

async function createappointment(app) {
  if(app.doctor.status === 'FREE') {
    
    var appoint = getFactory().newResource('org.ehr.basic', 'AppointLetter', app.id);
    
    appoint.dt = app.dt;
    appoint.status = 'CONFIRMED';
    appoint.patient = getFactory().newRelationship('org.ehr.basic', 'Patient', 			app.patient.getIdentifier());
    appoint.doctor = getFactory().newRelationship('org.ehr.basic', 'Doctor', app.doctor.getIdentifier());
    
    app.doctor.status = 'BUSY';
    
    let assetRegistry = await getAssetRegistry('org.ehr.basic.AppointLetter');
    await assetRegistry.add(appoint);
    
    let docRegistry = await getParticipantRegistry('org.ehr.basic.Doctor');
    await docRegistry.update(app.doctor);
    }
  else {
  	throw new Error ('Doctor already has an appointment confirmed');
  }
}

/**
 * Transaction for consultation between doctor and patient.
 * @param {org.ehr.basic.Consult} cnslt - The sample transaction instance.
 * @transaction
 */
async function appointment(atx) {
  if(atx.appletter.status == 'CONFIRMED' && atx.appletter.patient.id == atx.patient.id) {
    
    var value = atx.patient.amount - atx.doctor.consultanceFee;
    if(value < 0) { 
      throw new Error('Not enough amount');
      return 1;
    }
    atx.patient.amount = value;
    let patientRegistry = await getParticipantRegistry('org.ehr.basic.Patient');
   	await patientRegistry.update(atx.patient);
      	
    var pres = getFactory().newResource('org.ehr.basic', 'Prescription', atx.prescriptionId);
    pres.prescribed = [];
    for (let n = 0; n < atx.prescribed.length; n++) {
      pres.prescribed.push(atx.prescribed[n]);
    }
    pres.tests = [];
    for (let n = 0; n < atx.tests.length; n++) {
      pres.tests.push(getFactory().newRelationship('org.ehr.basic', 'Tests', 			atx.tests[n].getIdentifier()));
    }
    pres.patient = getFactory().newRelationship('org.ehr.basic', 'Patient', 			atx.patient.getIdentifier());
   	pres.doctor = getFactory().newRelationship('org.ehr.basic', 'Doctor', atx.doctor.getIdentifier());
    	
    let assetRegistry = await getAssetRegistry('org.ehr.basic.Prescription');
   	await assetRegistry.add(pres);
     
    assetRegistry = await getAssetRegistry('org.ehr.basic.AppointLetter')
    atx.appletter.status = 'CONSULTED';
    await assetRegistry.update(atx.appletter);
      
    let docRegistry = await getParticipantRegistry('org.ehr.basic.Doctor');
    atx.doctor.status = 'FREE';
   	await docRegistry.update(atx.doctor);
    }
  	else {
      if (atx.appletter.status == 'CONSULTED')
        throw new Error('Already consulted!');
      else if (atx.appletter.patient.id != atx.patient.id)
        throw new Error('Patient Id doesn\'t match');
      else
        throw new Error('Appointment Status Incorrect')
    }
}

/**
 * Transaction for getting tests done.
 * @param {org.ehr.basic.Testing} tst - The sample transaction instance.
 * @transaction
 */
async function testing(tst) {
  if(tst.appletter.status == 'CONSULTED' && tst.paper.patient.id == tst.patient.id) {
    for(var n = 0; n < tst.paper.tests.length; n++) {
      
      const testsRegistry = await getAssetRegistry('org.ehr.basic.Tests');
      var details = await testsRegistry.get( tst.paper.tests[n].getIdentifier() );
      var amount = tst.patient.amount - details.price;
      if (amount < 0) {
        throw new Error('Not enough amount to get '+ details.id + ' test done!');
        return 1;
      }
      	
      let patientRegistry = await getParticipantRegistry('org.ehr.basic.Patient');
      tst.patient.amount = amount;
      await patientRegistry.update(tst.patient);
      
      let testNotification = getFactory().newEvent('org.ehr.basic', 'TestNotification');
      testNotification.id = tst.paper.tests[n].id;
      testNotification.price = details.price;
      testNotification.testdone = true;
      emit(testNotification);
      
      if (n == (tst.paper.tests.length - 1)) {
        let presRegistry = await getAssetRegistry('org.ehr.basic.Prescription');
      	tst.paper.testDone = true;
      	await presRegistry.update(tst.paper);
        
        let appRegistry = await getAssetRegistry('org.ehr.basic.AppointLetter');
        tst.appletter.status = 'TESTED';
        await appRegistry.update(tst.appletter);
        
        let techRegistry = await getParticipantRegistry('org.ehr.basic.Technician');
      	tst.tech.paper.push(tst.paper);
        await techRegistry.update(tst.tech);
      }
    }
  }
  else if (tst.appletter.status == 'TESTED') {
    throw new Error('You have been tested already')
  }
  else if (tst.appletter.status != 'CONSULTED') {
    throw new Error('You have to get consulted before getting tested');
  }
  else
    throw new Error('Some error occured')
}

/**
 * Transaction for seling medicine.
 * @param {org.ehr.basic.SellMed} med - The sample transaction instance.
 * @transaction
 */

async function sellMedicine(med){
  if((med.appletter.status === 'TESTED' || med.appletter.status === 'CONSULTED') && med.paper.medicinesBought != true) {
    for(var n = 0; n < med.paper.prescribed.length; n++){
      var amount = 0;
      switch (String(med.paper.prescribed[n])) {
        case 'ASETAMINOPHIN':
          amount = 44.8;
          break;
        case 'ASPIRIN':
          amount = 37.8;
          break;
        case 'PARACETAMOL':
          amount = 10.5;
          break;
        case 'AMLODIPINE':
          amount = 24.56;
          break;
        case 'FLUOXETINE':
          amount = 20.3;
          break;
        case 'ALPRAZOLAM':
          amount = 34.1;
          break;
      }
      var value = med.patient.amount - amount;
      if(value < 0)
        throw new Error('Not enough money to buy ' + String(med.paper.prescribed[n]) + ' medicine');
      
      let patientRegistry = await getParticipantRegistry('org.ehr.basic.Patient');
      med.patient.amount = value;
      await patientRegistry.update(med.patient);
      
      let buyNotification = getFactory().newEvent('org.ehr.basic', 'BuyNotification');
      buyNotification.name = med.paper.prescribed[n];
      buyNotification.amount = amount;
      buyNotification.purchased = true;
      emit(buyNotification);
      
      if(n == (med.paper.prescribed.length - 1)) {
        let presRegistry = await getAssetRegistry('org.ehr.basic.Prescription');
        med.paper.medicinesBought = true;
        await presRegistry.update(med.paper);
        
        let chemRegistry = await getParticipantRegistry('org.ehr.basic.Chemist');
        med.chem.paper.push(med.paper);
        await chemRegistry.update(med.chem);
      }
    }
  }
  else {
  	if(med.appletter.status != 'TESTED' && med.appletter.status != 'CONSULTED') {
      throw new Error('Get consulted before buying medicines');
    }
    else if (med.paper.medicinesBought == true) {
      throw new Error('Medicines already bought');
    }
    else
      throw new Error('Some error occured!!')
  }
}