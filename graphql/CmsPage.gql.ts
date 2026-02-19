/* eslint-disable */
import * as Types from '@graphcommerce/graphql-mesh/.mesh';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

export const GetCmsPageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCmsPage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"identifier"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cmsPage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"identifier"},"value":{"kind":"Variable","name":{"kind":"Name","value":"identifier"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"identifier"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"content_heading"}},{"kind":"Field","name":{"kind":"Name","value":"meta_title"}},{"kind":"Field","name":{"kind":"Name","value":"meta_description"}}]}}]}}]} as unknown as DocumentNode<GetCmsPageQuery, GetCmsPageQueryVariables>;

export type GetCmsPageQueryVariables = Types.Exact<{
  identifier: Types.Scalars['String']['input'];
}>;

export type GetCmsPageQuery = { 
  cmsPage?: { 
    identifier?: string | null;
    title?: string | null;
    content?: string | null;
    content_heading?: string | null;
    meta_title?: string | null;
    meta_description?: string | null;
  } | null;
};