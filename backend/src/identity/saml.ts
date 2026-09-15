import crypto from 'crypto';
import { DOMParser } from '@xmldom/xmldom';
import { SignedXml } from 'xml-crypto';
import { IdentityError } from './core';

export type SamlAssertion = {
    assertionId: string;
    issuer: string;
    audience?: string;
    destination?: string;
    recipient?: string;
    inResponseTo?: string;
    notBefore?: Date;
    notOnOrAfter?: Date;
    subject: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    groups: string[];
    xml: string;
};

type XmlNode = {
    textContent?: string | null;
    localName?: string;
    getAttribute?(name: string): string | null;
    getAttributeNS?(ns: string | null, name: string): string | null;
    getElementsByTagName?(name: string): ArrayLike<XmlNode>;
};

function text(node: XmlNode | null | undefined) {
    return (node?.textContent || '').trim();
}

function first(doc: XmlNode, local: string): XmlNode | null {
    const nodes = doc.getElementsByTagName?.('*') || [];
    for (let i = 0; i < nodes.length; i += 1) {
        if (nodes[i].localName === local) return nodes[i];
    }
    return null;
}

function all(doc: XmlNode, local: string): XmlNode[] {
    const nodes = doc.getElementsByTagName?.('*') || [];
    const out: XmlNode[] = [];
    for (let i = 0; i < nodes.length; i += 1) {
        if (nodes[i].localName === local) out.push(nodes[i]);
    }
    return out;
}

function attr(node: XmlNode | null | undefined, name: string) {
    if (!node) return '';
    return node.getAttribute?.(name) || node.getAttributeNS?.(null, name) || '';
}

function pemFromConfigured(cert: string) {
    const raw = cert.replace(/-----BEGIN CERTIFICATE-----/g, '').replace(/-----END CERTIFICATE-----/g, '').replace(/\s+/g, '');
    return `-----BEGIN CERTIFICATE-----\n${raw.match(/.{1,64}/g)?.join('\n') || raw}\n-----END CERTIFICATE-----`;
}

function verifyXmlSignature(xml: string, certificate: string) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml') as unknown as XmlNode;
    const signatures = all(doc, 'Signature');
    if (!signatures.length) {
        throw new IdentityError('invalid_signature');
    }
    const pem = pemFromConfigured(certificate);
    for (const signature of signatures) {
        const verifier = new SignedXml();
        verifier.getCertFromKeyInfo = () => pem;
        verifier.loadSignature(signature as never);
        try {
            if (!verifier.checkSignature(xml)) {
                throw new IdentityError('invalid_signature');
            }
        } catch {
            throw new IdentityError('invalid_signature');
        }
    }
}

function attributeValues(assertion: XmlNode, names: string[]) {
    const wanted = new Set(names.map((name) => name.toLowerCase()));
    const values: string[] = [];
    const attributes = assertion.getElementsByTagName?.('*') || [];
    for (let i = 0; i < attributes.length; i += 1) {
        const node = attributes[i];
        if (node.localName !== 'Attribute') continue;
        const name = (node.getAttribute?.('Name') || node.getAttribute?.('FriendlyName') || '').toLowerCase();
        if (!wanted.has(name) && ![...wanted].some((item) => name.endsWith(item))) continue;
        const kids = node.getElementsByTagName?.('*') || [];
        for (let j = 0; j < kids.length; j += 1) {
            if (kids[j].localName === 'AttributeValue' && kids[j].textContent) {
                values.push(String(kids[j].textContent).trim());
            }
        }
    }
    return values.filter(Boolean);
}

export function parseAndValidateSamlResponse(input: {
    samlResponseB64: string;
    idpCertificate: string;
    expectedIssuer: string;
    expectedAudience: string;
    expectedDestination: string;
    expectedInResponseTo?: string;
    now?: Date;
}): SamlAssertion {
    let xml = '';
    try {
        xml = Buffer.from(input.samlResponseB64, 'base64').toString('utf8');
    } catch {
        throw new IdentityError('invalid_signature');
    }
    if (!xml.includes('Assertion') && !xml.includes('Response')) {
        throw new IdentityError('invalid_signature');
    }
    verifyXmlSignature(xml, input.idpCertificate);
    const doc = new DOMParser().parseFromString(xml, 'text/xml') as unknown as XmlNode;
    const response = first(doc, 'Response');
    const assertion = first(doc, 'Assertion');
    if (!assertion) throw new IdentityError('invalid_signature');
    const issuer = text(first(doc, 'Issuer'));
    if (issuer !== input.expectedIssuer) throw new IdentityError('issuer_mismatch');
    const audience = text(first(doc, 'Audience'));
    if (audience && audience !== input.expectedAudience) throw new IdentityError('audience_mismatch');
    const destination = attr(response, 'Destination');
    if (destination && destination !== input.expectedDestination) throw new IdentityError('destination_mismatch');
    const subjectConf = all(assertion, 'SubjectConfirmationData')[0];
    const recipient = attr(subjectConf, 'Recipient');
    if (recipient && recipient !== input.expectedDestination) throw new IdentityError('recipient_mismatch');
    const inResponseTo = attr(response, 'InResponseTo') || attr(subjectConf, 'InResponseTo');
    if (input.expectedInResponseTo && inResponseTo !== input.expectedInResponseTo) {
        throw new IdentityError('state_mismatch');
    }
    const conditions = first(doc, 'Conditions');
    const notBefore = attr(conditions, 'NotBefore') ? new Date(attr(conditions, 'NotBefore')) : undefined;
    const notOnOrAfter = attr(conditions, 'NotOnOrAfter') ? new Date(attr(conditions, 'NotOnOrAfter')) : undefined;
    const now = input.now || new Date();
    if (notBefore && now < new Date(notBefore.getTime() - 60_000)) throw new IdentityError('expired_assertion');
    if (notOnOrAfter && now > notOnOrAfter) throw new IdentityError('expired_assertion');
    const nameId = text(first(doc, 'NameID'));
    const emails = attributeValues(assertion, ['email', 'mail', 'emailaddress', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']);
    const firstNames = attributeValues(assertion, ['firstname', 'givenname', 'first_name', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname']);
    const lastNames = attributeValues(assertion, ['lastname', 'surname', 'last_name', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname']);
    const groups = attributeValues(assertion, ['groups', 'group', 'memberof', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']);
    return {
        assertionId: attr(assertion, 'ID') || `missing-${crypto.randomUUID()}`,
        issuer,
        audience,
        destination,
        recipient,
        inResponseTo: inResponseTo || undefined,
        notBefore,
        notOnOrAfter,
        subject: nameId || emails[0] || '',
        email: emails[0] || (nameId.includes('@') ? nameId : undefined),
        firstName: firstNames[0],
        lastName: lastNames[0],
        groups,
        xml,
    };
}

export function buildSpMetadata(input: { entityId: string; acsUrl: string }) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${escapeXml(input.entityId)}">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${escapeXml(input.acsUrl)}" index="0" isDefault="true"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
}

export function buildAuthnRequest(input: { issuer: string; acsUrl: string; destination: string; requestId: string }) {
    const issueInstant = new Date().toISOString();
    const xml = `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${input.requestId}" Version="2.0" IssueInstant="${issueInstant}" Destination="${escapeXml(input.destination)}" AssertionConsumerServiceURL="${escapeXml(input.acsUrl)}"><saml:Issuer>${escapeXml(input.issuer)}</saml:Issuer></samlp:AuthnRequest>`;
    return Buffer.from(xml, 'utf8').toString('base64');
}

export function escapeXml(value: string) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function createSignedSamlResponse(input: {
    privateKey: string;
    certificate: string;
    issuer: string;
    audience: string;
    destination: string;
    nameId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    groups?: string[];
    inResponseTo?: string;
    assertionId?: string;
    notBefore?: Date;
    notOnOrAfter?: Date;
}) {
    const assertionId = input.assertionId || `_${crypto.randomBytes(16).toString('hex')}`;
    const responseId = `_${crypto.randomBytes(16).toString('hex')}`;
    const now = new Date();
    const notBefore = (input.notBefore || new Date(now.getTime() - 60_000)).toISOString();
    const notOnOrAfter = (input.notOnOrAfter || new Date(now.getTime() + 5 * 60_000)).toISOString();
    const groups = (input.groups || []).map((group) => `<saml:AttributeValue>${escapeXml(group)}</saml:AttributeValue>`).join('');
    const assertion = `<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${assertionId}" Version="2.0" IssueInstant="${now.toISOString()}">
      <saml:Issuer>${escapeXml(input.issuer)}</saml:Issuer>
      <saml:Subject>
        <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${escapeXml(input.nameId)}</saml:NameID>
        <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
          <saml:SubjectConfirmationData Recipient="${escapeXml(input.destination)}" ${input.inResponseTo ? `InResponseTo="${escapeXml(input.inResponseTo)}"` : ''} NotOnOrAfter="${notOnOrAfter}"/>
        </saml:SubjectConfirmation>
      </saml:Subject>
      <saml:Conditions NotBefore="${notBefore}" NotOnOrAfter="${notOnOrAfter}">
        <saml:AudienceRestriction><saml:Audience>${escapeXml(input.audience)}</saml:Audience></saml:AudienceRestriction>
      </saml:Conditions>
      <saml:AttributeStatement>
        <saml:Attribute Name="email"><saml:AttributeValue>${escapeXml(input.email)}</saml:AttributeValue></saml:Attribute>
        <saml:Attribute Name="firstName"><saml:AttributeValue>${escapeXml(input.firstName || 'Alex')}</saml:AttributeValue></saml:Attribute>
        <saml:Attribute Name="lastName"><saml:AttributeValue>${escapeXml(input.lastName || 'User')}</saml:AttributeValue></saml:Attribute>
        <saml:Attribute Name="groups">${groups}</saml:Attribute>
      </saml:AttributeStatement>
    </saml:Assertion>`;
    const unsigned = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="${responseId}" Version="2.0" IssueInstant="${now.toISOString()}" Destination="${escapeXml(input.destination)}" ${input.inResponseTo ? `InResponseTo="${escapeXml(input.inResponseTo)}"` : ''}><saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${escapeXml(input.issuer)}</saml:Issuer>${assertion}</samlp:Response>`;
    const signer = new SignedXml({ privateKey: input.privateKey, publicCert: input.certificate });
    signer.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
    signer.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
    signer.addReference({
        xpath: "//*[local-name(.)='Assertion']",
        digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
        transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', 'http://www.w3.org/2001/10/xml-exc-c14n#'],
    });
    signer.computeSignature(unsigned, { location: { reference: "//*[local-name(.)='Assertion']", action: 'append' } });
    return Buffer.from(signer.getSignedXml(), 'utf8').toString('base64');
}
