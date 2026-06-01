import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import letterheadImg from '../assets/letterhead.png';

const styles = StyleSheet.create({
  page: {
    padding: 0,
    color: '#000000',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -100,
  },
  contentContainer: {
    paddingTop: 120, // prevents overlap with letterhead header
    paddingBottom: 80, // prevents overlap with footer signatures
    paddingHorizontal: 45,
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    lineHeight: 1.4,
  },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    textDecoration: 'underline',
    textTransform: 'uppercase',
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  subHeading: {
    fontFamily: 'Helvetica-Bold',
    marginTop: 12,
    marginBottom: 8,
    fontSize: 9.5,
  },
  paragraph: {
    marginBottom: 10,
    textAlign: 'justify',
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    marginTop: 15,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  footerText: {
    position: 'absolute',
    bottom: 30,
    left: 45,
    right: 45,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#000000',
    textAlign: 'center',
  },
  witnessText: {
    marginTop: 25,
    marginBottom: 20,
    fontFamily: 'Helvetica-Bold',
  },
  signatureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  signatureBlock: {
    width: '45%',
  },
  signTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
    marginBottom: 6,
  },
  signCompany: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    marginBottom: 6,
  },
  signLabel: {
    fontSize: 9,
    color: '#000000',
    marginBottom: 4,
  },
  signLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    width: '100%',
    marginTop: 25,
  }
});

const AgreementTemplate = ({ data }) => {
  const installments = data.Installments || [];

  return (
    <Document>
      {/* --- PAGE 1 --- */}
      <Page size="A4" style={styles.page}>
        <Image src={letterheadImg} style={styles.backgroundImage} />

        <View style={styles.contentContainer}  >
          <Text style={styles.title}>Settlement Agreement</Text>

          <Text style={styles.paragraph}>
            This Settlement Agreement (“<Text style={styles.bold}>Agreement</Text>”) is made and executed on the <Text style={styles.bold}>{data.Date || '_________________'}</Text> at Jaipur.
          </Text>

          <Text style={styles.subHeading}>BY AND BETWEEN</Text>

          <Text style={styles.paragraph}>
            <Text style={styles.bold}>{data.FirstPartyCompany || '_________________'}</Text>, a company incorporated under the provisions of the Companies Act, 2013, having its registered office at 7th floor, Galaxy Avenue, Tonk Road, Jaipur, 302015 (hereinafter referred to as the “<Text style={styles.bold}>First Party</Text>” or “<Text style={styles.bold}>Service Provider</Text>”, which expression shall include its successors and assigns);
          </Text>

          <Text style={styles.subHeading}>AND</Text>

          <Text style={styles.paragraph}>
            <Text style={styles.bold}>{data.SecondCompany || '_________________'}</Text>, through its authorized representative, <Text style={styles.bold}>{data.ClientName || '_________________'}</Text> at {data.Address || '_________________'}, {data.Pincode || '______'} (hereinafter referred to as the “<Text style={styles.bold}>Second Party</Text>” or “<Text style={styles.bold}>Client</Text>”, which expression shall include its successors and assigns).
          </Text>

          <Text style={styles.paragraph}>
            The First Party and Second Party are hereinafter collectively referred to as the “<Text style={styles.bold}>Parties</Text>” and individually as a “<Text style={styles.bold}>Party</Text>”.
          </Text>

          <Text style={styles.sectionTitle}>BACKGROUND</Text>

          <Text style={styles.paragraph}>
            The Second Party had engaged the First Party for certain consultancy and/or business-related services.
          </Text>
          <Text style={styles.paragraph}>
            Certain disputes and differences arose between the Parties in relation to the said services.
          </Text>
          <Text style={styles.paragraph}>
            The Parties have mutually agreed to resolve all disputes amicably through this Agreement.
          </Text>

          <Text style={styles.sectionTitle}>SETTLEMENT AMOUNT</Text>
          <Text style={styles.paragraph}>
            The Parties mutually agree that a total amount of <Text style={styles.bold}>₹ {data.Amount || '0'}/-</Text> (<Text style={styles.bold}>{data.AmountInWords || '_________________'}</Text>) shall be paid by the First Party to the Second Party towards full and final settlement.
          </Text>
        </View>

        <Text style={styles.footerText}>First Party: ____________________          Second Party: ____________________</Text>
      </Page>

      {/* --- PAGE 2 --- */}
      <Page size="A4" style={styles.page}>
        <Image src={letterheadImg} style={styles.backgroundImage} />

        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>PAYMENT SCHEDULE</Text>
          <Text style={styles.paragraph}>
            The settlement amount shall be paid in <Text style={styles.bold}>{data.InstallmentCountWords || 'One (1)'}</Text> {data.InstallmentPlural || 'installment'} as follows:
          </Text>

          {/* Dynamic Installments List */}
          <View style={{ marginBottom: 15, paddingLeft: 10 }}>
            {installments.length > 0 ? (
              installments.map((inst) => (
                <Text key={inst.index} style={[styles.paragraph, styles.bold]}>
                  Installment {inst.index}: ₹ {inst.amount}/- payable on {inst.date}.
                </Text>
              ))
            ) : (
              <Text style={[styles.paragraph, styles.bold]}>
                Installment 1: ₹ {data.Amount || '0'}/- payable on _________________.
              </Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>CONDITION PRECEDENT (WITHDRAWAL OF COMPLAINTS)</Text>
          <Text style={styles.paragraph}>
            The Second Party agrees to withdraw all complaints, cases, or grievances filed against the First Party and provide proof of the same. The First Party shall proceed with the payment schedule only upon receipt of such proof.
          </Text>

          <Text style={styles.sectionTitle}>FULL AND FINAL SETTLEMENT</Text>
          <Text style={styles.paragraph}>
            Upon payment of the entire settlement amount, this Agreement shall constitute a full and final settlement of all disputes.
          </Text>

          <Text style={styles.sectionTitle}>NO FURTHER CLAIMS</Text>
          <Text style={styles.paragraph}>
            The Second Party shall not initiate any further legal proceedings against the First Party.
          </Text>

          <Text style={styles.sectionTitle}>NON-ADMISSION OF LIABILITY</Text>
          <Text style={styles.paragraph}>
            This Agreement does not constitute an admission of liability by the First Party.
          </Text>

          <Text style={styles.sectionTitle}>CONFIDENTIALITY & NON-DISPARAGEMENT</Text>
          <Text style={styles.paragraph}>
            Both Parties agree to maintain confidentiality and shall not publish or circulate any defamatory or negative content.
          </Text>

          <Text style={styles.sectionTitle}>DEFAULT CLAUSE</Text>
          <Text style={styles.paragraph}>
            In case of delay, the Parties shall mutually resolve the matter in good faith.
          </Text>

          <Text style={styles.sectionTitle}>ELECTRONIC EXECUTION</Text>
          <Text style={styles.paragraph}>
            This Agreement may be executed electronically and shall be valid under the Information Technology Act, 2000.
          </Text>
        </View>

        <Text style={styles.footerText}>First Party: ____________________          Second Party: ____________________</Text>
      </Page>

      {/* --- PAGE 3 --- */}
      <Page size="A4" style={styles.page}>
        <Image src={letterheadImg} style={styles.backgroundImage} />

        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>GOVERNING LAW & JURISDICTION</Text>
          <Text style={styles.paragraph}>
            This Agreement shall be governed by Indian law and courts at Jaipur, Rajasthan shall have jurisdiction.
          </Text>

          <Text style={styles.sectionTitle}>SOCIAL MEDIA & PROFESSIONAL CONDUCT</Text>
          <Text style={styles.paragraph}>
            Both parties agree to maintain a respectful and professional approach throughout the duration of this Agreement.
          </Text>
          <Text style={styles.paragraph}>
            The Second Party agrees to pause (and where applicable, remove) any ongoing social media posts, comments, or public discussions related to the First Party during the settlement period. It is further agreed that no new public statements or content of similar nature will be initiated.
          </Text>
          <Text style={styles.paragraph}>
            Upon full clearance of all pending dues, both parties shall consider the matter fully resolved and agree not to engage in any such discussions or actions in the future. Further, both parties agree, where appropriate, to redefine and present the matter with a positive and constructive perspective, reflecting closure and mutual understanding.
          </Text>

          <Text style={styles.sectionTitle}>VOLUNTARY EXECUTION</Text>
          <Text style={styles.paragraph}>
            This Agreement is executed voluntarily without any coercion or undue influence.
          </Text>

          <Text style={styles.witnessText}>IN WITNESS WHEREOF, the Parties have signed this Agreement.</Text>

          <View style={styles.signatureContainer}>
            {/* First Party Sign Block */}
            <View style={styles.signatureBlock}>
              <Text style={styles.signTitle}>FIRST PARTY</Text>
              <Text style={styles.signCompany}>{data.FirstPartyCompany || '_________________'}</Text>
              <Text style={styles.signLabel}>Authorized Signatory:</Text>
              <Text style={styles.signLabel}>Name: <Text style={styles.bold}>{data.FirstPartyName || '_________________'}</Text></Text>
              <Text style={styles.signLabel}>Signature: </Text>
              <View style={styles.signLine} />
            </View>

            {/* Second Party Sign Block */}
            <View style={styles.signatureBlock}>
              <Text style={styles.signTitle}>SECOND PARTY</Text>
              <Text style={styles.signCompany}>{data.SecondCompany || '_________________'}</Text>
              <Text style={styles.signLabel}>Authorized Signatory:</Text>
              <Text style={styles.signLabel}>Name: <Text style={styles.bold}>{data.SecondPartyName || '_________________'}</Text></Text>
              <Text style={styles.signLabel}>Signature: </Text>
              <View style={styles.signLine} />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default AgreementTemplate;
